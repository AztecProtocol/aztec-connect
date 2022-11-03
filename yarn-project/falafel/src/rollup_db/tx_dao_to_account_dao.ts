import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxDao, AccountDao } from '../entity/index.js';
import { TxType } from '@aztec/barretenberg/blockchain';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';

export const txDaoToAccountDao = (txDao: TxDao) => {
  const { accountPublicKey, aliasHash } = OffchainAccountData.fromBuffer(txDao.offchainTxData);
  return new AccountDao({
    accountPublicKey: accountPublicKey.toBuffer(),
    aliasHash: aliasHash.toBuffer(),
    tx: txDao,
  });
};

export const getNewAccountDaos = (txDaos: TxDao[]) =>
  txDaos
    .filter(tx => tx.txType === TxType.ACCOUNT)
    // It's a new account when the proof is nullifying the account public key.
    .filter(tx => tx.nullifier2 && !!toBigIntBE(tx.nullifier2))
    .map(txDaoToAccountDao);
