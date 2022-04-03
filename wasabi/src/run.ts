import { AgentManager } from './agent_manager';
import {
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
 * Currently 110% of total agents requirements, to have enough for fees.
 */
export function getAgentRequiredFunding(agentType: string, numAgents: number) {
  switch (agentType) {
    case 'payment':
      return (PaymentAgent.getRequiredFunding() * BigInt(numAgents) * 110n) / 100n;
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

export async function run(
  fundingPrivateKey: Buffer,
  agentType: string,
  numAgents: number,
  numDefiSwaps: number,
  numPayments: number,
  rollupHost: string,
  host: string,
  confs: number,
  loops: number,
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

  // Create a unique address for this process, loop until we successfully fund it. It may fail if other
  // processes are also trying to fund from the funding account (nonce races). Once this process address
  // is funded, we don't need to worry about other wasabi's interferring with our txs.
  const processPrivateKey = randomBytes(32);
  const processAddress = provider.addAccount(processPrivateKey);
  while (true) {
    try {
      const deposit = getAgentRequiredFunding(agentType, numAgents);
      console.log(`funding process address ${processAddress} with ${deposit} wei...`);
      const txHash = await asset.transfer(deposit, fundingAddress, processAddress);
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

  for (let runNumber = 0; runNumber != loops; ++runNumber) {
    const agentManager = new AgentManager(
      sdk,
      provider,
      ethereumRpc,
      processAddress,
      agentType,
      numAgents,
      numDefiSwaps,
      numPayments,
    );

    console.log(`Starting wasabi run ${runNumber}...`);
    const start = new Date();
    await agentManager.run();
    const timeTaken = new Date().getTime() - start.getTime();
    console.log(`Test run ${runNumber} completed: ${timeTaken / 1000}s.`);
  }

  // We are exiting gracefully, refund the funding account from our process account.
  const fee = toBaseUnits('420', 12);
  const value = (await this.sdk.getPublicBalance(0, processAddress)) - fee;
  console.log(`refunding funding address ${fundingAddress} with ${value} wei...`);
  const txHash = await asset.transfer(value, processAddress, fundingAddress);
  await sdk.getTransactionReceipt(txHash);

  await sdk.destroy();
}
