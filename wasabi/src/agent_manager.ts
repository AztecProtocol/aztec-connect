import { AztecSdk, EthAddress, EthereumRpc, WalletProvider } from '@aztec/sdk';
import { EthAddressAndNonce } from './agent';
import { AgentKeyInfo, buildMnemonicPath } from './agent_key';
import { ethDepositCost } from './assets';
import { asyncMap } from './async_map';
import { SwappingAgent } from './swapping_agent';
import { PaymentAgent } from './payment_agent';
import {
  LIDO_CURVE_ETH_TO_STETH_BRIDGE_CONFIG,
  LIDO_CURVE_STETH_TO_ETH_BRIDGE_CONFIG,
  UNISWAP_DAI_TO_ETH_BRIDGE_CONFIG,
  UNISWAP_ETH_TO_DAI_BRIDGE_CONFIG,
} from './bridges';

type StandardAgents = SwappingAgent | PaymentAgent;

export class AgentManager {
  private agents: Array<StandardAgents> = [];
  public constructor(
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private ethereumRpc: EthereumRpc,
    private fundingAddress: EthAddress,
    private agentType: string,
    private numAgents: number,
    private numTxsPerAgent: number,
    private numConcurrentTransfers: number,
    private agentKeyInfo?: AgentKeyInfo,
  ) {}

  private getUsersPrivateKey(id: number) {
    if (this.agentKeyInfo) {
      const address = this.provider.addAccountFromMnemonicAndPath(
        this.agentKeyInfo.mnemonic,
        buildMnemonicPath(this.agentKeyInfo.account, id),
      );
      const privateKey = this.provider.getPrivateKeyForAddress(address);
      return privateKey;
    }
    // if no agent key info, then return undefined, a private key will be generated randomly
    return undefined;
  }

  private async createAgent(id: number, fundingAccount: EthAddressAndNonce) {
    const usersPrivateKey = this.getUsersPrivateKey(id + 1);
    const agentId = id + ((this.agentKeyInfo?.account ?? 1) - 1) * this.numAgents;
    switch (this.agentType) {
      case 'payment':
        return await PaymentAgent.create(
          fundingAccount,
          this.sdk,
          this.provider,
          agentId,
          this.numTxsPerAgent,
          this.numConcurrentTransfers,
          usersPrivateKey,
        );
      case 'uniswap':
        return await SwappingAgent.create(
          fundingAccount,
          this.sdk,
          this.provider,
          agentId,
          this.numTxsPerAgent,
          2n,
          UNISWAP_ETH_TO_DAI_BRIDGE_CONFIG,
          UNISWAP_DAI_TO_ETH_BRIDGE_CONFIG,
          usersPrivateKey,
        );
      case 'lidocurve':
        return await SwappingAgent.create(
          fundingAccount,
          this.sdk,
          this.provider,
          agentId,
          this.numTxsPerAgent,
          2000n,
          LIDO_CURVE_ETH_TO_STETH_BRIDGE_CONFIG,
          LIDO_CURVE_STETH_TO_ETH_BRIDGE_CONFIG,
          usersPrivateKey,
        );
      default:
        throw new Error(`Unknown agent type: ${this.agentType}`);
    }
  }

  public async init() {
    const fundingNonce = await this.ethereumRpc.getTransactionCount(this.fundingAddress);
    const fundingAccount: EthAddressAndNonce = { address: this.fundingAddress, nonce: fundingNonce };
    this.agents = await asyncMap(Array.from({ length: this.numAgents }), async (_, i) => {
      return await this.createAgent(i, fundingAccount);
    });
  }

  private async getFundsRequiredToBeDepositedToAztec() {
    const requirements = await asyncMap(this.agents, async a => {
      const requirements = await a.getFundingRequirement();
      return requirements.filter(x => x.assetId == 0);
    });
    const requirement = requirements.flat().reduce((p, c) => c.value + p, 0n);
    return await this.additionalDepositRequired(requirement);
  }

  // detemines how much funding we need
  // sums the individual requirement of all the agents
  // if the result is > 0 then we need to add on the fee for making the deposit to contract
  public async getRequiredFunds(gasPriceGwei: number) {
    const additional = await this.getFundsRequiredToBeDepositedToAztec();
    if (additional > 0) {
      return ethDepositCost(gasPriceGwei) + additional;
    }
    return additional;
  }

  public async run() {
    const requiredFunds = await this.getFundsRequiredToBeDepositedToAztec();
    await this.makePendingDeposit(requiredFunds);
    await Promise.all(this.agents.map(a => a.run()));
  }

  private async additionalDepositRequired(fundsRequired: bigint) {
    const currentPendingDeposit = await this.sdk.getUserPendingDeposit(0, this.fundingAddress);
    return fundsRequired - currentPendingDeposit;
  }

  private async makePendingDeposit(fundsRequired: bigint) {
    if (fundsRequired <= 0n) {
      return;
    }
    const difference = await this.additionalDepositRequired(fundsRequired);
    if (difference <= 0) {
      console.log(`No need to deposit funds to contract for address ${this.fundingAddress}`);
      return;
    }
    console.log(`Topping up pending deposit with ${this.sdk.fromBaseUnits({ assetId: 0, value: difference }, true)}`);
    await this.sdk.depositFundsToContract({ assetId: 0, value: difference }, this.fundingAddress, this.provider);
    while ((await this.sdk.getUserPendingDeposit(0, this.fundingAddress)) < fundsRequired) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}
