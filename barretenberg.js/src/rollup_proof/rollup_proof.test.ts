import { randomBytes } from 'crypto';
import { ProofData } from '../client_proofs/proof_data';
import { RollupProofData, InnerProofData } from './';
import { numToUInt32BE } from '../serialize';
import { EthAddress } from '../address';
import { ViewingKey } from '../viewing_key';

describe('RollupProofData', () => {
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

  it('can convert a inner proof object to buffer and back', () => {
    const buffer = innerProofData.toBuffer();
    const recovered = InnerProofData.fromBuffer(buffer);
    expect(recovered).toEqual(innerProofData);
  });

  it('can convert a rollup proof object to buffer and back', () => {
    const viewingKeys = [
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
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

    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
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
      totalTxFees,
      2,
      [accountInnerProofData, jsInnerProofData],
      randomBytes(32 * 16),
      viewingKeys,
    );

    const buffer = rollupProofData.toBuffer();
    const recoveredRollup = RollupProofData.fromBuffer(
      buffer,
      Buffer.concat(viewingKeys.flat().map(vk => vk.toBuffer())),
    );

    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should parse an escape hatch proof with rollup size 0', () => {
    const rollupSize = 0;
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    const rollupProofData = new RollupProofData(
      70,
      rollupSize,
      150,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      totalTxFees,
      1,
      [innerProofData],
      randomBytes(32 * 16),
      [],
    );

    const buffer = rollupProofData.toBuffer();
    const recoveredRollup = RollupProofData.fromBuffer(buffer);

    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should throw if totalTxFees is of the wrong size', () => {
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    totalTxFees.push(randomBytes(32));

    expect(
      () =>
        new RollupProofData(
          70,
          2,
          150,
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          totalTxFees,
          2,
          [innerProofData],
          randomBytes(32 * 16),
          [],
        ),
    ).toThrow();
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
    const joinSplitProof = new ProofData(joinSplitProofData);

    expect(innerProofData.txId).toEqual(joinSplitProof.txId);
  });
});
