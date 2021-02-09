import { RollupProviderExplorer, Rollup, Tx } from 'barretenberg/rollup_provider';
import { TxHash } from 'barretenberg/tx_hash';
import createDebug from 'debug';
import { EventEmitter } from 'events';

const debug = createDebug('bb:txs_state');

export class TxsState extends EventEmitter {
  private running = false;
  private rollups: Rollup[] = [];
  private txs: Tx[] = [];

  constructor(private explorer: RollupProviderExplorer, private latest = 5) {
    super();
  }

  private async fetchLatestRollups() {
    const rollups = await this.explorer.getLatestRollups(this.latest);
    const hasChanged = rollups.some(rollup => {
      const prev = this.rollups.find(r => r.id === rollup.id);
      return !prev || prev.status !== rollup.status;
    });

    if (hasChanged) {
      this.rollups = rollups;
      this.emit('rollups', this.rollups);
    }
  }

  private async fetchLatestTxs() {
    const txs = await this.explorer.getLatestTxs(this.latest);
    const hasChanged = txs.some(tx => {
      const prevTx = this.txs.find(t => t.txHash.equals(tx.txHash));
      return !prevTx || prevTx.rollup?.status !== tx.rollup?.status;
    });

    if (hasChanged) {
      this.txs = txs;
      this.emit('txs', this.txs);
    }
  }

  public async start() {
    this.running = true;

    while (this.running) {
      try {
        await Promise.all([this.fetchLatestRollups(), this.fetchLatestTxs()]);
      } catch (err) {
        debug(err);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public stop() {
    this.running = false;
  }

  public async getLatestRollups(count: number) {
    return this.explorer.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.explorer.getLatestTxs(count);
  }

  public async getRollup(id: number) {
    return this.explorer.getRollup(id);
  }

  public async getTx(txHash: TxHash) {
    return this.explorer.getTx(txHash);
  }
}
