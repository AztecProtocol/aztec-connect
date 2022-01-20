import { EthAddress, ProofId, UserPaymentTx } from '@aztec/sdk';

export class TransactionGraph {
  private readonly inputOwners: Buffer[] = [];
  private readonly outputOwners: Buffer[] = [];

  constructor(jsTxs: UserPaymentTx[]) {
    jsTxs.forEach(({ proofId, publicOwner }) => {
      if (proofId === ProofId.DEPOSIT && !this.isDepositor(publicOwner!)) {
        this.inputOwners.push(publicOwner!.toBuffer());
      }
      if (proofId === ProofId.WITHDRAW && !this.isRecipient(publicOwner!)) {
        this.outputOwners.push(publicOwner!.toBuffer());
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
