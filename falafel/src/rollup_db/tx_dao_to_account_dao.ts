import { AccountProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { AccountDao } from '../entity/account';
import { TxDao } from '../entity';

export const txDaoToAccountDao = (txDao: TxDao) => {
  const proofData = new AccountProofData(new ProofData(txDao.proofData));
  const account = new AccountDao();
  account.aliasHash = proofData.accountAliasId.aliasHash.toBuffer();
  account.nonce = proofData.accountAliasId.nonce;
  account.accountPubKey = proofData.publicKey;
  account.tx = txDao;
  return account;
};
