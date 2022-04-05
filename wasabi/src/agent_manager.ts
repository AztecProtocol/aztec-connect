import { AztecSdk, EthAddress, EthereumRpc, WalletProvider } from '@aztec/sdk';
import { EthAddressAndNonce } from './agent';
// import { DefiAgent } from './defi_agent';
import { PaymentAgent } from './payment_agent';

export function getAgentRequiredFunding(agentType: string) {
  switch (agentType) {
    case 'payment':
      return PaymentAgent.getRequiredFunding();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

export class AgentManager {
  public constructor(
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private ethereumRpc: EthereumRpc,
    private fundingAddress: EthAddress,
    private agentType: string,
    private numAgents: number,
    private numTxsPerAgent: number,
  ) {}

  private createAgent(id: number, fundingAccount: EthAddressAndNonce) {
    switch (this.agentType) {
      case 'payment':
        return new PaymentAgent(fundingAccount, this.sdk, this.provider, id, this.numTxsPerAgent);
      // case 'defi':
      //   return new DefiAgent(this.fundingAddress, this.sdk, this.provider, this.agents.length, this.numDefiSwaps);
      default:
        throw new Error(`Unknown agent type: ${this.agentType}`);
    }
  }

  public async run() {
    const fundingNonce = await this.ethereumRpc.getTransactionCount(this.fundingAddress);
    const fundingAccount: EthAddressAndNonce = { address: this.fundingAddress, nonce: fundingNonce };

    const agents = Array.from({ length: this.numAgents }).map((_, i) => this.createAgent(i, fundingAccount));

    await Promise.all(agents.map(a => a.run()));
  }
}
