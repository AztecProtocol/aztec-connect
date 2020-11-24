import { randomBytes } from 'crypto';
import { ProofData } from '../client_proofs/proof_data';
import { RollupProofData, InnerProofData, VIEWING_KEY_SIZE } from './';
import { numToUInt32BE } from '../serialize';
import { EthAddress } from '../address';

describe('RollupProofData', () => {
  it('can convert a inner proof object to buffer and back', () => {
    const innerProofData = new InnerProofData(
      0,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
    );

    const buffer = innerProofData.toBuffer();
    const recovered = InnerProofData.fromBuffer(buffer);
    expect(recovered).toEqual(innerProofData);
  });

  it('can convert a rollup proof object to buffer and back', () => {
    const viewingKeys = [
      [Buffer.alloc(0), Buffer.alloc(0)],
      [randomBytes(VIEWING_KEY_SIZE), randomBytes(VIEWING_KEY_SIZE)],
    ];
    const accountInnerProofData = new InnerProofData(
      1,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
    );
    const jsInnerProofData = new InnerProofData(
      0,
      randomBytes(32),
      randomBytes(32),
      numToUInt32BE(1, 32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      EthAddress.randomAddress().toBuffer32(),
      EthAddress.randomAddress().toBuffer32(),
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
      2,
      [accountInnerProofData, jsInnerProofData],
      randomBytes(32 * 16),
      viewingKeys,
    );

    const buffer = rollupProofData.toBuffer();
    const recoveredRollup = RollupProofData.fromBuffer(buffer, Buffer.concat(viewingKeys.flat()));

    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should generate the same txId from inner proof as from join split proof', () => {
    const innerProofData = new InnerProofData(
      0,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
    );

    const joinSplitProofData = Buffer.concat([innerProofData.toBuffer(), randomBytes(32), randomBytes(32)]);
    const joinSplitProof = new ProofData(joinSplitProofData, []);

    expect(innerProofData.txId).toEqual(joinSplitProof.txId);
  });
});
