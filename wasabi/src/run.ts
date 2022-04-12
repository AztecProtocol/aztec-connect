import { AgentManager } from './agent_manager';
import { ElementAgentManager } from './element_agent_manager';
import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  EthAsset,
  EthereumProvider,
  EthereumRpc,
  JsonRpcProvider,
  toBaseUnits,
  WalletProvider,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { PaymentAgent } from './payment_agent';
import { UniswapAgent } from './uniswap_agent';
import { ElementAgent } from './element_agent';
import { ManualPaymentAgent } from './manual_payment_agent';

async function initSdk(provider: EthereumProvider, serverUrl: string, minConfirmation = 1) {
  const sdk = await createAztecSdk(provider, {
    serverUrl,
    memoryDb: true,
    minConfirmation,
  });

  await sdk.run();
  await sdk.awaitSynchronised();
  return sdk;
}

/**
 * Return the amount of wei this process will take from the primary funding account.
 * We add 10% per loop.
 * We will re-fund if we drop below 110% requirement.
 */
async function getAgentRequiredFunding(
  sdk: AztecSdk,
  agentType: string,
  numAgents: number,
  numTransfers: number,
  assetIds: number[],
  loops = 10,
) {
  const fundingBufferPercent = 10n * BigInt(loops);
  switch (agentType) {
    case 'uniswap': {
      const value = UniswapAgent.getRequiredFunding() * BigInt(numAgents);
      const fundingThreshold = (value * 110n) / 100n;
      const toFund = (value * (100n + fundingBufferPercent)) / 100n;
      return { fundingThreshold, toFund };
    }
    case 'element': {
      const value = ElementAgent.getRequiredFunding() * BigInt(numAgents) + ManualPaymentAgent.getRequiredFunding();
      const fundingThreshold = (value * 110n) / 100n;
      const toFund = (value * (100n + fundingBufferPercent)) / 100n;
      return { fundingThreshold, toFund };
    }
    case 'payment': {
      const value = (await PaymentAgent.getRequiredFunding(sdk, assetIds[0], numTransfers)) * BigInt(numAgents);
      const fundingThreshold = (value * 110n) / 100n;
      const toFund = (value * (100n + fundingBufferPercent)) / 100n;
      return { fundingThreshold, toFund };
    }
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
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
  loops?: number,
) {
  const ethereumProvider = new JsonRpcProvider(host);
  const ethereumRpc = new EthereumRpc(ethereumProvider);
  const provider = new WalletProvider(ethereumProvider);
  const sdk = await initSdk(provider, rollupHost, confs);
  const asset = new EthAsset(provider);

  let fundingAddress: EthAddress;
  if (fundingPrivateKey.length) {
    fundingAddress = provider.addAccount(fundingPrivateKey);
  } else {
    [fundingAddress] = await ethereumRpc.getAccounts();
  }

  const fundingAddressBalance = await sdk.getPublicBalanceAv(0, fundingAddress);
  console.log(`primary funding account: ${fundingAddress} (${sdk.fromBaseUnits(fundingAddressBalance, true)})`);

  // Create a unique address for this process.
  const processPrivateKey = randomBytes(32);
  const processAddress = provider.addAccount(processPrivateKey);

  for (let runNumber = 0; runNumber !== loops; ++runNumber) {
    console.log(`starting wasabi run ${runNumber}...`);
    const start = new Date();

    // Loop until we successfully fund process address. It may fail if other processes are also trying to fund
    // from the funding account (nonce races). Once this process address is funded, we don't need to worry about
    // other wasabi's interferring with our txs.
    const { toFund, fundingThreshold } = await getAgentRequiredFunding(
      sdk,
      agentType,
      numAgents,
      numTxsPerAgent,
      assets,
      loops,
    );
    while ((await sdk.getPublicBalance(0, processAddress)) < fundingThreshold) {
      try {
        console.log(`funding process address ${processAddress} with ${toFund} wei...`);
        const txHash = await asset.transfer(toFund, fundingAddress, processAddress);
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
            assets,
          )
        : new ElementAgentManager(sdk, provider, ethereumRpc, processAddress, numAgents, numTxsPerAgent, assets);

    console.log(`starting wasabi run ${runNumber}...`);
    await agentManager.run();

    const timeTaken = new Date().getTime() - start.getTime();
    console.log(`test run ${runNumber} completed: ${timeTaken / 1000}s.`);
  }

  // We are exiting gracefully, refund the funding account from our process account.
  const fee = toBaseUnits('420', 12);
  const value = (await sdk.getPublicBalance(0, processAddress)) - fee;
  if (value > 0) {
    console.log(`refunding funding address ${fundingAddress} with ${value} wei...`);
    const txHash = await asset.transfer(value, processAddress, fundingAddress);
    await sdk.getTransactionReceipt(txHash);
  }
  await sdk.destroy();
}
