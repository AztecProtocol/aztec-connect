import { randomBytes } from '../../crypto/index.js';
import { AliasHash } from '../../account_id/index.js';
import { EthAddress, GrumpkinAddress } from '../../address/index.js';
import { toBigIntBE } from '../../bigint_buffer/index.js';
import { BridgeCallData } from '../../bridge_call_data/index.js';
import { HashPath } from '../../merkle_tree/index.js';
import { ClaimNoteTxData, TreeNote } from '../../note_algorithms/index.js';
import { ProofId } from '../proof_data/index.js';
import { JoinSplitTx } from './join_split_tx.js';

const randomBigInt = () => toBigIntBE(randomBytes(30));

const randomInt = () => randomBytes(4).readUInt32BE();

const randomHashPath = (size = 4) =>
  new HashPath(
    Array(size)
      .fill(0)
      .map(() => [randomBytes(32), randomBytes(32)]),
  );

const randomTreeNote = () =>
  new TreeNote(
    GrumpkinAddress.random(),
    randomBigInt(),
    randomInt(),
    !!(randomInt() % 2),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
  );

const randomClaimNoteTxData = () =>
  new ClaimNoteTxData(randomBigInt(), BridgeCallData.random(), randomBytes(32), randomBytes(32));

describe('join split tx', () => {
  it('convert join split tx to and from buffer', () => {
    const tx = new JoinSplitTx(
      ProofId.WITHDRAW,
      BigInt(123),
      EthAddress.random(),
      randomInt(),
      2,
      [randomInt(), randomInt()],
      randomBytes(32),
      [randomHashPath(), randomHashPath()],
      [randomTreeNote(), randomTreeNote()],
      [randomTreeNote(), randomTreeNote()],
      randomClaimNoteTxData(),
      randomBytes(32),
      AliasHash.random(),
      true,
      randomInt(),
      randomHashPath(),
      GrumpkinAddress.random(),
      randomBytes(32),
      3,
    );
    const buf = tx.toBuffer();
    expect(JoinSplitTx.fromBuffer(buf)).toEqual(tx);
  });
});
