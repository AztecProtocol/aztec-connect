const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BitConfig {
  static EMPTY = new BitConfig(false, false, false, false, false, false);

  constructor(
    public readonly firstInputVirtual: boolean,
    public readonly secondInputVirtual: boolean,
    public readonly firstOutputVirtual: boolean,
    public readonly secondOutputVirtual: boolean,
    public readonly secondInputReal: boolean,
    public readonly secondOutputReal: boolean,
  ) {}

  static fromBigInt(val: bigint) {
    return new BitConfig(
      getNumber(val, 0, 1) == 0 ? false : true,
      getNumber(val, 1, 1) == 0 ? false : true,
      getNumber(val, 2, 1) == 0 ? false : true,
      getNumber(val, 3, 1) == 0 ? false : true,
      getNumber(val, 4, 1) == 0 ? false : true,
      getNumber(val, 5, 1) == 0 ? false : true,
    );
  }

  toBigInt() {
    return (
      BigInt(this.firstInputVirtual) +
      (BigInt(this.secondInputVirtual) << BigInt(1)) +
      (BigInt(this.firstOutputVirtual) << BigInt(2)) +
      (BigInt(this.secondOutputVirtual) << BigInt(3)) +
      (BigInt(this.secondInputReal) << BigInt(4)) +
      (BigInt(this.secondOutputReal) << BigInt(5))
    );
  }
}
