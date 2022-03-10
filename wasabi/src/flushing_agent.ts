import { AztecSdk, EthAddress, toBaseUnits, WalletProvider } from '@aztec/sdk';
import { Agent, UserData } from './agent';
import { PaymentAgent } from './payment_agent';

/**
 * Not used currently. Was originally written to push through a flushing transaction if all agents were awaiting
 * settlement. This won't work correctly however, if there are multiple wasabi processes. Instead, falafel has
 * a FLUSH_AFTER_IDLE flag which achieves the goal properly.
 * Will leave this in codebase for now, it maybe useful at some point.
 */
export class FlushingAgent {
  private agent: Agent;
  private user!: UserData;
  private running = true;

  constructor(
    fundingAddress: EthAddress,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private agents: PaymentAgent[],
  ) {
    this.agent = new Agent(fundingAddress, sdk, provider, 666);
  }

  public async init() {
    this.user = await this.agent.createUser();

    const deposit = toBaseUnits('0.01', 18);
    await this.agent.fundEthAddress(this.user, deposit);

    // The flusher will perform an instant deposit, so it can get busy flushing.
    const shield = toBaseUnits('0.001', 18);
    await this.agent.deposit(this.user, shield, true);
  }

  public async run() {
    while (this.running) {
      try {
        if (this.agents.filter(a => !a.isComplete()).every(a => a.isAwaitingSettlement())) {
          console.log(`All running agents are awaiting settlement. Flushing...`);
          await this.sdk.flushRollup(this.user.user.id, this.user.signer);
        }
      } catch (err: any) {
        console.log(`ERROR: `, err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public stop() {
    this.running = false;
  }
}