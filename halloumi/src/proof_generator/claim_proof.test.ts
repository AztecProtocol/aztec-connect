import { DefiInteractionNote, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { randomBytes } from 'crypto';
import { ClaimProof } from './claim_proof';

const randomDataPath = () => new HashPath([...Array(32)].map(() => [randomBytes(32), randomBytes(32)]));
const randomInt = (to = 2 ** 32) => Math.floor(Math.random() * (to + 1));
const randomBigInt = () => BigInt(`0x${randomBytes(32).toString('hex')}`);

describe('Claim Proof', () => {
  it('serialize claim proof data to buffer and deserialize it back', () => {
    const claimProofData = new ClaimProof(
      randomBytes(32),
      randomBytes(32),
      randomInt(),
      randomDataPath(),
      TreeClaimNote.random(),
      randomInt(),
      randomDataPath(),
      DefiInteractionNote.random(),
      randomBytes(32),
      randomBigInt(),
      randomBigInt(),
    );

    const buf = claimProofData.toBuffer();
    expect(buf).toBeInstanceOf(Buffer);

    const recovered = ClaimProof.fromBuffer(buf);
    expect(recovered).toEqual(claimProofData);
  });
});
