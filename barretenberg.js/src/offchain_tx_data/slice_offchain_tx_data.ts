import { ProofId } from '../client_proofs';
import { OffchainAccountData } from './offchain_account_data';
import { OffchainDefiDepositData } from './offchain_defi_deposit_data';
import { OffchainJoinSplitData } from './offchain_join_split_data';

export function getOffchainDataLength(proofId: ProofId) {
  switch (proofId) {
    case ProofId.DEPOSIT:
    case ProofId.WITHDRAW:
    case ProofId.SEND:
      return OffchainJoinSplitData.SIZE;
    case ProofId.ACCOUNT:
      return OffchainAccountData.SIZE;
    case ProofId.DEFI_DEPOSIT:
      return OffchainDefiDepositData.SIZE;
    default:
      return 0;
  }
}

export const sliceOffchainTxData = (proofIds: ProofId[], offchainTxData: Buffer) => {
  let dataStart = 0;
  let dataEnd = 0;
  const result = proofIds.map(proofId => {
    dataStart = dataEnd;
    dataEnd += getOffchainDataLength(proofId);
    return offchainTxData.slice(dataStart, dataEnd);
  });
  if (dataEnd != offchainTxData.length) {
    throw new Error('Offchain data has unexpected length for given proof ids.');
  }
  return result;
};
