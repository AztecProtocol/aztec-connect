import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { AccountDao } from '../entity/account';
import { TxDao } from '../entity';

export const txDaoToAccountDao = (txDao: TxDao) => {
  const { accountPublicKey, aliasHash } = OffchainAccountData.fromBuffer(txDao.offchainTxData);
  return new AccountDao({
    accountPublicKey: accountPublicKey.toBuffer(),
    aliasHash: aliasHash.toBuffer(),
    tx: txDao,
  });
};
