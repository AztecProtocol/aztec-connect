import { randomBytes } from 'crypto';
import { JoinSplitProof } from '../client_proofs/join_split_proof';
import { RollupProofData, InnerProofData, VIEWING_KEY_SIZE } from './';
import { EthAddress } from '../address';

describe('RollupProofData', () => {
  it('can convert a inner proof object to buffer and back', () => {
    const innerProofData = new InnerProofData(
      0,
      randomBytes(32),
      randomBytes(32),
      0,
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
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
      0,
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
    );
    const jsInnerProofData = new InnerProofData(
      0,
      randomBytes(32),
      randomBytes(32),
      0,
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
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
      0,
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
    );

    const joinSplitProofData = Buffer.concat([innerProofData.toBuffer(), randomBytes(32), randomBytes(32)]);
    const joinSplitProof = new JoinSplitProof(joinSplitProofData, []);

    expect(innerProofData.getTxId()).toEqual(joinSplitProof.txId);
  });
});
