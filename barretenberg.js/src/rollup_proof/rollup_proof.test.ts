import { randomBytes } from 'crypto';
import { JoinSplitProof } from '../client_proofs/join_split_proof';
import { RollupProofData, InnerProofData } from './';

describe('RollupProofData', () => {
  it('can convert a inner proof object to buffer and back', () => {
    const viewingKeys = [randomBytes(176), randomBytes(176)];
    const innerProofData = new InnerProofData(
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(20),
      randomBytes(20),
      viewingKeys,
    );

    const buffer = innerProofData.toBuffer();
    const recovered = InnerProofData.fromBuffer(buffer, viewingKeys);
    expect(recovered).toEqual(innerProofData);
  });

  it('can convert a rollup proof object to buffer and back', () => {
    const viewingKeys = [randomBytes(176), randomBytes(176)];
    const innerProofData = new InnerProofData(
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(20),
      randomBytes(20),
      viewingKeys,
    );
    const rollupProofData = new RollupProofData(
      70,
      2,
      150,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      1,
      [innerProofData],
    );

    const buffer = rollupProofData.toBuffer();
    const recoveredRollup = RollupProofData.fromBuffer(buffer, Buffer.concat(viewingKeys));
    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should generate the same txId from inner proof as from join split proof', () => {
    const viewingKeys = [randomBytes(176), randomBytes(176)];
    const innerProofData = new InnerProofData(
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(20),
      randomBytes(20),
      viewingKeys,
    );

    const joinSplitProofData = Buffer.concat([innerProofData.toBuffer(), randomBytes(32), randomBytes(32)]);
    const joinSplitProof = new JoinSplitProof(joinSplitProofData, viewingKeys);

    expect(innerProofData.getTxId()).toEqual(joinSplitProof.getTxId());
  });
});
