export interface RoundData {
  roundId: bigint;
  price: bigint;
  timestamp: number;
}

export interface PriceFeed {
  price(): Promise<bigint>;
  latestRound(): Promise<bigint>;
  getRoundData(roundId: bigint): Promise<RoundData>;
  getHistoricalPrice(round: bigint): Promise<bigint>;
}
