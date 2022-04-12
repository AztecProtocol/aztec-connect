import { AssetValue, AztecSdk, EthAddress, EthereumRpc, WalletProvider } from '@aztec/sdk';
import { EthAddressAndNonce } from './agent';
import { purchaseAssets } from './assets';
import { PaymentAgent } from './payment_agent';
import { UniswapAgent } from './uniswap_agent';

export class AgentManager {
  public constructor(
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private ethereumRpc: EthereumRpc,
    private fundingAddress: EthAddress,
    private agentType: string,
    private numAgents: number,
    private numTxsPerAgent: number,
    private numConcurrentTransfers: number,
    private assets: number[],
  ) {}

  private createAgent(id: number, fundingAccount: EthAddressAndNonce) {
    switch (this.agentType) {
      case 'payment':
        return new PaymentAgent(
          fundingAccount,
          this.sdk,
          this.provider,
          id,
          this.numTxsPerAgent,
          this.numConcurrentTransfers,
          this.assets[0],
        );
      case 'uniswap':
        return new UniswapAgent(fundingAccount, this.sdk, this.provider, id, this.numTxsPerAgent);
      default:
        throw new Error(`Unknown agent type: ${this.agentType}`);
    }
  }

  public async run() {
    if (this.assets[0] != 0) {
      // attempt to buy twice the amount needed just to be sure we end up with enough (slippage etc)
      const assetValue: AssetValue = {
        assetId: this.assets[0],
        value: BigInt(this.numAgents * this.numTxsPerAgent * 2),
      };
      await purchaseAssets(this.sdk, this.fundingAddress, this.provider, [assetValue], 10n ** 9n);
    }

    const fundingNonce = await this.ethereumRpc.getTransactionCount(this.fundingAddress);
    const fundingAccount: EthAddressAndNonce = { address: this.fundingAddress, nonce: fundingNonce };

    const agents = Array.from({ length: this.numAgents }).map((_, i) => this.createAgent(i, fundingAccount));
    await Promise.all(agents.map(a => a.run()));
  }
}
