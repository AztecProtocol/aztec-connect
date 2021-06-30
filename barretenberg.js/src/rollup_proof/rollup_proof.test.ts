import { randomBytes } from 'crypto';
import { EthAddress } from '../address';
import { ProofData, ProofId } from '../client_proofs/proof_data';
import { ViewingKey } from '../viewing_key';
import { InnerProofData, RollupProofData } from './';

describe('RollupProofData', () => {
  const randomInnerProofData = (proofId = ProofId.JOIN_SPLIT) =>
    new InnerProofData(
      proofId,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(64),
      randomBytes(64),
      randomBytes(32),
      randomBytes(32),
      proofId === ProofId.JOIN_SPLIT ? EthAddress.randomAddress().toBuffer32() : randomBytes(32),
      proofId === ProofId.JOIN_SPLIT ? EthAddress.randomAddress().toBuffer32() : randomBytes(32),
    );

  const toViewingKeyData = (viewingKeys: ViewingKey[][]) => Buffer.concat(viewingKeys.flat().map(vk => vk.toBuffer()));

  const createRollupProofData = (innerProofs: InnerProofData[], viewingKeys: ViewingKey[][] = []) => {
    const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiInteractionNotes = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(64));
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    return new RollupProofData(
      70,
      innerProofs.length,
      150,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      bridgeIds,
      defiDepositSums,
      totalTxFees,
      innerProofs,
      randomBytes(RollupProofData.LENGTH_RECURSIVE_PROOF_OUTPUT),
      defiInteractionNotes,
      randomBytes(32),
      viewingKeys,
    );
  };

  it('can convert a inner proof object to buffer and back', () => {
    const innerProofData = randomInnerProofData();
    const buffer = innerProofData.toBuffer();
    expect(buffer.length).toBe(InnerProofData.LENGTH);

    const recovered = InnerProofData.fromBuffer(buffer);
    expect(recovered).toEqual(innerProofData);
  });

  it('can convert a rollup proof object to buffer and back', () => {
    const accountInnerProofData = randomInnerProofData(ProofId.ACCOUNT);
    const jsInnerProofData = randomInnerProofData();
    const viewingKeys = [
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    const rollupProofData = createRollupProofData([accountInnerProofData, jsInnerProofData], viewingKeys);
    const buffer = rollupProofData.toBuffer();

    const recoveredRollup = RollupProofData.fromBuffer(buffer, rollupProofData.getViewingKeyData());
    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('can convert a rollup proof object to buffer and back with two js txs', () => {
    const jsInnerProofData0 = randomInnerProofData();
    const jsInnerProofData1 = randomInnerProofData();
    const viewingKeys = [
      [ViewingKey.random(), ViewingKey.random()],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    const rollupProofData = createRollupProofData([jsInnerProofData0, jsInnerProofData1], viewingKeys);
    const buffer = rollupProofData.toBuffer();
    const recoveredRollup = RollupProofData.fromBuffer(buffer, toViewingKeyData(viewingKeys));
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
          randomBytes(32),
          randomBytes(32),
          [randomBytes(32)],
          [randomBytes(32)],
          totalTxFees,
          [randomInnerProofData()],
          randomBytes(32 * 16),
          [randomBytes(32)],
          randomBytes(32),
          [],
        ),
    ).toThrow();
  });

  it('should generate the same txId for all proof types', () => {
    [ProofId.JOIN_SPLIT, ProofId.ACCOUNT, ProofId.DEFI_CLAIM, ProofId.DEFI_CLAIM].forEach(proofId => {
      const innerProofData = new InnerProofData(
        proofId,
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
      const rawClientProof = Buffer.concat([innerProofData.toBuffer(), randomBytes(32), randomBytes(32)]);
      const clientProofData = new ProofData(rawClientProof);
      expect(innerProofData.txId).toEqual(clientProofData.txId);
    });
  });
});
