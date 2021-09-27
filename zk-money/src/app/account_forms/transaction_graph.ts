import { EthAddress, UserJoinSplitTx } from '@aztec/sdk';

export class TransactionGraph {
  private readonly inputOwners: Buffer[] = [];
  private readonly outputOwners: Buffer[] = [];

  constructor(jsTxs: UserJoinSplitTx[]) {
    jsTxs.forEach(({ inputOwner, outputOwner }) => {
      if (inputOwner && !this.isDepositor(inputOwner)) {
        this.inputOwners.push(inputOwner.toBuffer());
      }
      if (outputOwner && !this.isRecipient(outputOwner)) {
        this.outputOwners.push(outputOwner.toBuffer());
      }
    });
  }

  isDepositor(address: EthAddress) {
    const buf = address.toBuffer();
    return this.inputOwners.some(owner => owner.equals(buf));
  }

  isRecipient(address: EthAddress) {
    const buf = address.toBuffer();
    return this.outputOwners.some(owner => owner.equals(buf));
  }
}
