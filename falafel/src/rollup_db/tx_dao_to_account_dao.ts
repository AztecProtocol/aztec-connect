import { AccountProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { AccountDao } from '../entity/account';
import { TxDao } from '../entity/tx';

export const txDaoToAccountDao = (txDao: TxDao) => {
  const accountProof = new AccountProofData(new ProofData(txDao.proofData));
  return new AccountDao({
    aliasHash: accountProof.accountAliasId.aliasHash.toBuffer(),
    tx: txDao,
    accountPubKey: accountProof.publicKey,
    nonce: accountProof.accountAliasId.nonce,
  });
};
