import { randomBytes } from 'crypto';
import { AccountAliasId } from '../../account_id';
import { EthAddress, GrumpkinAddress } from '../../address';
import { toBigIntBE } from '../../bigint_buffer';
import { BridgeId } from '../../bridge_id';
import { HashPath } from '../../merkle_tree';
import { ClaimNoteTxData, TreeNote } from '../../note_algorithms';
import { ProofId } from '../proof_data';
import { JoinSplitTx } from './join_split_tx';

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
    GrumpkinAddress.randomAddress(),
    randomBigInt(),
    randomInt(),
    randomInt(),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
  );

const randomClaimNoteTxData = () =>
  new ClaimNoteTxData(randomBigInt(), BridgeId.random(), randomBytes(32), randomBytes(32));

describe('join split tx', () => {
  it('convert join split tx to and from buffer', () => {
    const tx = new JoinSplitTx(
      ProofId.WITHDRAW,
      BigInt(123),
      EthAddress.randomAddress(),
      randomInt(),
      2,
      [randomInt(), randomInt()],
      randomBytes(32),
      [randomHashPath(), randomHashPath()],
      [randomTreeNote(), randomTreeNote()],
      [randomTreeNote(), randomTreeNote()],
      randomClaimNoteTxData(),
      randomBytes(32),
      AccountAliasId.random(),
      randomInt(),
      randomHashPath(),
      GrumpkinAddress.randomAddress(),
      randomBytes(32),
      3,
    );
    const buf = tx.toBuffer();
    expect(JoinSplitTx.fromBuffer(buf)).toEqual(tx);
  });
});
