import { gql } from 'apollo-boost';
import { POLL_INTERVAL } from '../queries';

export const NETWORK_STAT_POLL_INTERVAL = POLL_INTERVAL;

export const GET_NETWORK_STAT = gql`
  {
    totalBlocks: totalRollups
    totalTxs
    totalPendingTxs: totalTxs(where: { rollup_null: true })
    serverStatus {
      nextPublishTime
    }
  }
`;
