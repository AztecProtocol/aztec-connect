import { RollupDb } from './rollup_db';

export class CachedRollupDb extends RollupDb {
  private pendingTxCount = 0;
  private unsettledTxCount = 0;
  private nextRefreshTime = new Date().getTime();

  public async getPendingTxCount() {
    await this.refresh();
    return this.pendingTxCount;
  }

  public async getUnsettledTxCount() {
    await this.refresh();
    return this.unsettledTxCount;
  }

  private async refresh() {
    const now = new Date().getTime();
    if (now < this.nextRefreshTime) {
      return;
    }
    this.pendingTxCount = await super.getPendingTxCount();
    this.unsettledTxCount = await super.getUnsettledTxCount();
    this.nextRefreshTime = now + 1000;
  }
}
