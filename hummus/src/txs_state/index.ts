import { RollupProviderExplorer, Rollup, Tx } from 'barretenberg-es/rollup_provider';
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
    const rollups = await this.explorer.fetchLatestRollups(this.latest);
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
    const txs = await this.explorer.fetchLatestTxs(this.latest);
    const hasChanged = txs.some(tx => {
      const prevTx = this.txs.find(t => t.txId === tx.txId);
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

  public getLatestRollups() {
    return this.rollups;
  }

  public getLatestTxs() {
    return this.txs;
  }

  public async getRollup(id: number) {
    return this.explorer.fetchRollup(id);
  }

  public async getTx(txId: string) {
    return this.explorer.fetchTxByTxId(txId);
  }
}
