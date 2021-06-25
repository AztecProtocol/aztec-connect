import { Pedersen } from '../../crypto/pedersen';
import { numToUInt32BE } from '../../serialize';
import { AccountAliasId } from '../../account_id';

export function computeAccountAliasIdNullifier(accountAliasId: AccountAliasId, pedersen: Pedersen) {
  // Note that the accountAliasIdIndex should match the constant ACCOUNT_ALIAS_ID_NULLIFIER in 'notes/constants.hpp'
  // to ensure we use the same generators in computing Pedersen commitment.
  const accountAliasIdIndex = 7;
  const proofId = 1;
  const prefixBuf = numToUInt32BE(proofId, 32);
  return pedersen.compressWithHashIndex([prefixBuf, accountAliasId.toBuffer()], accountAliasIdIndex);
}
