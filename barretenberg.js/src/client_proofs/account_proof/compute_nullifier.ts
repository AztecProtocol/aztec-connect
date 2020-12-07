import { Pedersen } from '../../crypto/pedersen';
import { numToUInt32BE } from '../../serialize';
import { AccountAliasId } from '../account_alias_id';

export function computeAccountAliasIdNullifier(accountAliasId: AccountAliasId, pedersen: Pedersen) {
  const accountAliasIdIndex = 11;
  const proofId = 1;
  const prefixBuf = numToUInt32BE(proofId, 32);
  return pedersen.compressWithHashIndex([prefixBuf, accountAliasId.toBuffer()], accountAliasIdIndex);
}
