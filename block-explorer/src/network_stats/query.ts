import { gql } from 'apollo-boost';
import { POLL_INTERVAL } from '../queries';

export const NETWORK_STAT_POLL_INTERVAL = POLL_INTERVAL;

export interface NetworkStatsQueryData {
  totalBlocks: number;
  totalTxs: number;
  serverStatus: {
    nextPublishTime: Date;
    pendingTxCount: Date;
  };
}

export const GET_NETWORK_STAT = gql`
  {
    totalBlocks: totalRollups
    totalTxs
    serverStatus {
      nextPublishTime
      pendingTxCount
    }
  }
`;
