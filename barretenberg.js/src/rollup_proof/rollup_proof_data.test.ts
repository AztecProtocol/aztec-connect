import { randomBytes } from 'crypto';
import { ProofId } from '../client_proofs/proof_data';
import { ViewingKey } from '../viewing_key';
import {
  createRollupProofData,
  randomDepositProofData,
  randomInnerProofData,
  randomSendProofData,
  randomWithdrawProofData,
} from './fixtures';
import { InnerProofData } from './inner_proof';
import { RollupProofData } from './rollup_proof_data';

describe('RollupProofData', () => {
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

  it('can convert a rollup proof object to buffer and back with two js txs and their viewing keys', () => {
    const jsInnerProofData0 = randomInnerProofData();
    const jsInnerProofData1 = randomInnerProofData();
    const viewingKeys = [
      [ViewingKey.random(), ViewingKey.random()],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    const rollupProofData = createRollupProofData([jsInnerProofData0, jsInnerProofData1], viewingKeys);
    const buffer = rollupProofData.toBuffer();

    const recoveredRollup = RollupProofData.fromBuffer(buffer, rollupProofData.getViewingKeyData());
    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should throw if the number of totalTxFees is wrong', () => {
    const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    totalTxFees.push(randomBytes(32));
    const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiInteractionNotes = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(64));

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
          bridgeIds,
          defiDepositSums,
          assetIds,
          totalTxFees,
          [randomInnerProofData()],
          randomBytes(RollupProofData.LENGTH_RECURSIVE_PROOF_OUTPUT),
          defiInteractionNotes,
          randomBytes(32),
          [],
        ),
    ).toThrow();
  });

  it('should throw if the number of bridgeIds is wrong', () => {
    const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
    const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    bridgeIds.push(randomBytes(32));
    const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiInteractionNotes = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(64));

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
          bridgeIds,
          defiDepositSums,
          assetIds,
          totalTxFees,
          [randomInnerProofData()],
          randomBytes(RollupProofData.LENGTH_RECURSIVE_PROOF_OUTPUT),
          defiInteractionNotes,
          randomBytes(32),
          [],
        ),
    ).toThrow();
  });

  it('encode and decode', () => {
    const rollupProofData = createRollupProofData([
      randomInnerProofData(ProofId.ACCOUNT),
      randomDepositProofData(),
      randomInnerProofData(ProofId.DEFI_DEPOSIT),
      randomWithdrawProofData(),
      randomInnerProofData(ProofId.DEFI_CLAIM),
      randomSendProofData(),
    ]);
    const buffer = rollupProofData.toBuffer();
    const encoded = rollupProofData.encode();
    expect(encoded.length < buffer.length).toBe(true);
    expect(RollupProofData.decode(encoded)).toEqual(rollupProofData);
  });

  it('convert a rollup proof object to buffer and back with mixed proof types and viewing keys', () => {
    const innerProofs = [
      randomInnerProofData(ProofId.DEFI_CLAIM),
      randomInnerProofData(ProofId.JOIN_SPLIT),
      randomInnerProofData(ProofId.ACCOUNT),
      randomInnerProofData(ProofId.DEFI_DEPOSIT),
    ];
    const viewingKeys = [
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    const rollupProofData = createRollupProofData(innerProofs, viewingKeys);
    const buffer = rollupProofData.toBuffer();

    const recoveredRollup = RollupProofData.fromBuffer(buffer, rollupProofData.getViewingKeyData());
    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should throw if some viewing keys are missing', () => {
    const innerProofs = [
      randomInnerProofData(ProofId.DEFI_CLAIM),
      randomInnerProofData(ProofId.JOIN_SPLIT),
      randomInnerProofData(ProofId.ACCOUNT),
      randomInnerProofData(ProofId.DEFI_DEPOSIT),
    ];
    const viewingKeys = [
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.EMPTY],
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    expect(() => createRollupProofData(innerProofs, viewingKeys)).toThrow();
  });

  it('should throw if there is an extra viewing key', () => {
    const innerProofs = [
      randomInnerProofData(ProofId.DEFI_CLAIM),
      randomInnerProofData(ProofId.JOIN_SPLIT),
      randomInnerProofData(ProofId.ACCOUNT),
      randomInnerProofData(ProofId.DEFI_DEPOSIT),
    ];
    const viewingKeys = [
      [ViewingKey.EMPTY, ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
      [ViewingKey.random(), ViewingKey.EMPTY],
      [ViewingKey.random(), ViewingKey.random()],
    ];
    expect(() => createRollupProofData(innerProofs, viewingKeys)).toThrow();
  });

  it('throw if viewing key buffer is shorter than it should be', () => {
    const innerProofs = [randomInnerProofData(ProofId.JOIN_SPLIT)];
    const viewingKeys = [[ViewingKey.random(), ViewingKey.random()]];
    const rollupProofData = createRollupProofData(innerProofs, viewingKeys);
    const buffer = rollupProofData.toBuffer();

    const viewingKeysBuf = rollupProofData.getViewingKeyData().slice(1);
    expect(() => RollupProofData.fromBuffer(buffer, viewingKeysBuf)).toThrow();
  });

  it('encode and decode padding proofs', () => {
    const rollupProofData = createRollupProofData([
      randomDepositProofData(),
      randomInnerProofData(ProofId.ACCOUNT),
      InnerProofData.PADDING,
      InnerProofData.PADDING,
      InnerProofData.PADDING,
    ]);
    const buffer = rollupProofData.toBuffer();
    const encoded = rollupProofData.encode();
    expect(encoded.length < buffer.length).toBe(true);
    expect(RollupProofData.decode(encoded)).toEqual(rollupProofData);
  });
});
