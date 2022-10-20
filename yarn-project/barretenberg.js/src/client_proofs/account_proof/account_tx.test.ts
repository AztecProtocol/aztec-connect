import { randomBytes } from '../../crypto/index.js';
import { AliasHash } from '../../account_id/index.js';
import { GrumpkinAddress } from '../../address/index.js';
import { HashPath } from '../../merkle_tree/index.js';
import { AccountTx } from './account_tx.js';

describe('account tx', () => {
  it('should convert to and from buffer', () => {
    const tx = new AccountTx(
      randomBytes(32),
      GrumpkinAddress.random(),
      GrumpkinAddress.random(),
      GrumpkinAddress.random(),
      GrumpkinAddress.random(),
      AliasHash.random(),
      false,
      true,
      123,
      new HashPath(
        Array(4)
          .fill(0)
          .map(() => [randomBytes(32), randomBytes(32)]),
      ),
      GrumpkinAddress.random(),
    );
    const buf = tx.toBuffer();
    expect(AccountTx.fromBuffer(buf)).toEqual(tx);
  });
});
