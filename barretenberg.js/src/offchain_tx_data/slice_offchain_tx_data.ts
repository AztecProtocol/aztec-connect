import { ProofId } from '../client_proofs';
import { OffchainAccountData } from './offchain_account_data';
import { OffchainDefiDepositData } from './offchain_defi_deposit_data';
import { OffchainJoinSplitData } from './offchain_join_split_data';

export const sliceOffchainTxData = (proofIds: ProofId[], offchainTxData: Buffer) => {
  let dataStart = 0;
  let dataEnd = 0;
  return proofIds.map(proofId => {
    dataStart = dataEnd;
    switch (proofId) {
      case ProofId.DEPOSIT:
      case ProofId.WITHDRAW:
      case ProofId.SEND:
        dataEnd += OffchainJoinSplitData.SIZE;
        return offchainTxData.slice(dataStart, dataEnd);
      case ProofId.ACCOUNT:
        dataEnd += OffchainAccountData.SIZE;
        return offchainTxData.slice(dataStart, dataEnd);
      case ProofId.DEFI_DEPOSIT:
        dataEnd += OffchainDefiDepositData.SIZE;
        return offchainTxData.slice(dataStart, dataEnd);
      default:
        return Buffer.alloc(0);
    }
  });
};
