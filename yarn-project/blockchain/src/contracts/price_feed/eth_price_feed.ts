import { PriceFeed } from '@aztec/barretenberg/blockchain';

export class EthPriceFeed implements PriceFeed {
  constructor() {}

  price() {
    return Promise.resolve(BigInt(10) ** BigInt(18));
  }

  latestRound() {
    return Promise.resolve(BigInt(0));
  }

  async getRoundData(roundId: bigint) {
    return {
      roundId,
      price: await this.price(),
      timestamp: 0,
    };
  }

  async getHistoricalPrice() {
    return await this.price();
  }
}
