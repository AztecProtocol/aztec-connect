/* eslint-disable @typescript-eslint/no-unused-vars */
import { PriceFeed } from 'barretenberg/blockchain';

export class EthPriceFeed implements PriceFeed {
  constructor() {}

  async price() {
    return BigInt(10) ** BigInt(18);
  }

  async latestRound() {
    return BigInt(0);
  }

  async getRoundData(roundId: bigint) {
    return {
      roundId,
      price: await this.price(),
      timestamp: 0,
    };
  }

  async getHistoricalPrice(roundId: bigint) {
    return this.price();
  }
}
