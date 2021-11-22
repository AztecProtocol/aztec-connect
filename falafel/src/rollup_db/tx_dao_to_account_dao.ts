import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { AccountDao } from '../entity/account';
import { TxDao } from '../entity/tx';

export const txDaoToAccountDao = (txDao: TxDao) => {
  const { accountPublicKey, accountAliasId } = OffchainAccountData.fromBuffer(txDao.offchainTxData);
  return new AccountDao({
    aliasHash: accountAliasId.aliasHash.toBuffer(),
    accountPubKey: accountPublicKey.toBuffer(),
    nonce: accountAliasId.nonce,
    txId: txDao.id,
  });
};
