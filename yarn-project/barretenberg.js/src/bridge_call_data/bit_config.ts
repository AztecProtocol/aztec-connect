const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BitConfig {
  static EMPTY = new BitConfig(false, false);

  constructor(public readonly secondInputInUse: boolean, public readonly secondOutputInUse: boolean) {}

  static fromBigInt(val: bigint) {
    return new BitConfig(getNumber(val, 0, 1) == 0 ? false : true, getNumber(val, 1, 1) == 0 ? false : true);
  }

  toBigInt() {
    return BigInt(this.secondInputInUse) + (BigInt(this.secondOutputInUse) << BigInt(1));
  }
}
