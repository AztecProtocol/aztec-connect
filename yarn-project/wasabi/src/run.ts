import { AgentManager } from './agent_manager.js';
import { ElementAgentManager } from './element_agent_manager.js';
import {
  createAztecSdk,
  EthAddress,
  EthAsset,
  EthereumProvider,
  EthereumRpc,
  JsonRpcProvider,
  WalletProvider,
  randomBytes,
} from '@aztec/sdk';
import { AgentKeyInfo, buildMnemonicPath } from './agent_key.js';
import { ethTransferCost } from './assets.js';

async function initSdk(provider: EthereumProvider, serverUrl: string, minConfirmation = 1, account?: number) {
  console.log(`creating sdk to ${serverUrl}`);
  const sdk = await createAztecSdk(provider, {
    identifier: account === undefined ? undefined : `${account}`,
    serverUrl,
    memoryDb: account === undefined,
    minConfirmation,
  });

  await sdk.run();
  await sdk.awaitSynchronised();
  return sdk;
}

/**
 * Return the amount of wei this process will take from the primary funding account.
 * In principle it's (cost to transfer the eth + the eth to transfer) * number of agents.
 * We expect to get most, but not all of funds back from agents. By adding a little overhead, we can largely avoid
 * the need to refund after each loop. Let's assume we loose 5% of funds per loop, and so add 5% per loop.
 * We will re-fund if we drop below the basic requirement.
 */
async function getAgentRequiredFunding(
  agentManager: AgentManager | ElementAgentManager,
  gasPriceGwei: number,
  loops = 10,
) {
  const value = await agentManager.getRequiredFunds(gasPriceGwei);
  const fundingBufferPercent = 5n * BigInt(loops);
  const fundingThreshold = value;
  const toFund = (value * (100n + fundingBufferPercent)) / 100n;
  return { fundingThreshold, toFund };
}

function getProcessAddress(provider: WalletProvider, agentKeyInfo?: AgentKeyInfo) {
  if (agentKeyInfo) {
    // add address index 0 for the provided account, this is the process address
    const address = provider.addAccountFromMnemonicAndPath(
      agentKeyInfo.mnemonic,
      buildMnemonicPath(agentKeyInfo.account, 0),
    );
    return address;
  }
  const processPrivateKey = randomBytes(32);
  return provider.addAccount(processPrivateKey);
}

export async function run(
  fundingPrivateKey: Buffer,
  agentType: string,
  numAgents: number,
  numTxsPerAgent: number,
  numConcurrentTransfers: number,
  assets: number[],
  rollupHost: string,
  host: string,
  confs: number,
  gasPriceGwei: number,
  loops?: number,
  mnemonic?: string,
  account?: number,
) {
  console.log(`Using gas price ${gasPriceGwei} gwei`);
  const ethereumProvider = new JsonRpcProvider(host);
  const ethereumRpc = new EthereumRpc(ethereumProvider);
  const provider = new WalletProvider(ethereumProvider);
  const sdk = await initSdk(provider, rollupHost, confs, account);
  const asset = new EthAsset(provider);
  const agentKeyInfo = mnemonic === undefined ? undefined : ({ mnemonic, account } as AgentKeyInfo);

  let fundingAddress: EthAddress;
  if (fundingPrivateKey.length) {
    fundingAddress = provider.addAccount(fundingPrivateKey);
  } else {
    [fundingAddress] = await ethereumRpc.getAccounts();
  }

  const fundingAddressBalance = await sdk.getPublicBalance(fundingAddress, 0);
  console.log(`primary funding: ${fundingAddress} (${sdk.fromBaseUnits(fundingAddressBalance, true)})`);

  // Create the appropriate address for the process
  const processAddress = getProcessAddress(provider, agentKeyInfo);
  const processAddressBalance = await sdk.getPublicBalance(processAddress, 0);
  console.log(`process address: ${processAddress} (${sdk.fromBaseUnits(processAddressBalance, true)})`);

  for (let runNumber = 0; runNumber !== loops; ++runNumber) {
    console.log(`starting wasabi run ${runNumber}...`);
    const start = new Date();

    const agentManager =
      agentType != 'element'
        ? new AgentManager(
            sdk,
            provider,
            ethereumRpc,
            processAddress,
            agentType,
            numAgents,
            numTxsPerAgent,
            numConcurrentTransfers,
            agentKeyInfo,
          )
        : new ElementAgentManager(sdk, provider, ethereumRpc, processAddress, numAgents, numTxsPerAgent, assets);

    await agentManager.init();

    // Loop until we successfully fund process address. It may fail if other processes are also trying to fund
    // from the funding account (nonce races). Once this process address is funded, we don't need to worry about
    // other wasabi's interferring with our txs.
    const { fundingThreshold, toFund } = await getAgentRequiredFunding(agentManager, gasPriceGwei, loops);
    while (toFund > 0 && (await sdk.getPublicBalance(processAddress, 0)).value < fundingThreshold) {
      try {
        const currentBalance = (await sdk.getPublicBalance(processAddress, 0)).value;
        const difference = toFund - currentBalance;
        if (difference <= 0) {
          console.log(
            `not needing to fund process ${processAddress} as it's balance is ${sdk.fromBaseUnits(
              { assetId: 0, value: currentBalance },
              true,
            )}`,
          );
          break;
        }
        console.log(
          `funding process address ${processAddress} current balance: ${sdk.fromBaseUnits(
            { assetId: 0, value: currentBalance },
            true,
          )}, topping up with ${sdk.fromBaseUnits({ assetId: 0, value: difference }, true)}...`,
        );
        const txHash = await asset.transfer(difference, fundingAddress, processAddress);
        const receipt = await sdk.getTransactionReceipt(txHash);
        if (!receipt.status) {
          throw new Error('receipt status is false.');
        }
        break;
      } catch (err: any) {
        console.log(`failed to fund process address, will retry: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`starting wasabi run ${runNumber}...`);
    await agentManager.run();

    const timeTaken = new Date().getTime() - start.getTime();
    console.log(`test run ${runNumber} completed: ${timeTaken / 1000}s.`);
  }
  //We are exiting gracefully, refund the funding account from our process account.
  const fee = ethTransferCost(gasPriceGwei);
  const value = (await sdk.getPublicBalance(processAddress, 0)).value - fee;
  if (value > 0) {
    console.log(
      `refunding funding address ${fundingAddress} with ${sdk.fromBaseUnits({ assetId: 0, value }, true)}...`,
    );
    const txHash = await asset.transfer(value, processAddress, fundingAddress);
    await sdk.getTransactionReceipt(txHash);
  }
  await sdk.destroy();
}
