import { ClientTx } from './client_tx';

export interface Rollup {
  rollupId: number;
  txs: ClientTx[];
}