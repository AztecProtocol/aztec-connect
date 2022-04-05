import { randomBytes } from 'crypto';
import { RollupDepositProofData } from '.';
import { ProofId } from '../client_proofs/proof_data';
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
    const innerProofs = [
      randomInnerProofData(ProofId.WITHDRAW),
      randomInnerProofData(ProofId.DEFI_CLAIM),
      randomInnerProofData(ProofId.DEPOSIT),
      randomInnerProofData(ProofId.ACCOUNT),
      randomInnerProofData(ProofId.SEND),
      randomInnerProofData(ProofId.DEFI_DEPOSIT),
    ];
    const rollupProofData = createRollupProofData(innerProofs);
    const buffer = rollupProofData.toBuffer();

    const recoveredRollup = RollupProofData.fromBuffer(buffer);
    expect(recoveredRollup).toEqual(rollupProofData);
  });

  it('should throw if the number of totalTxFees is wrong', () => {
    const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => 0);
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => BigInt(0));
    totalTxFees.push(BigInt(0));
    const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => BigInt(0));
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
          defiInteractionNotes,
          randomBytes(32),
          randomBytes(32),
          1,
          [randomInnerProofData()],
        ),
    ).toThrow();
  });

  it('should throw if the number of bridgeIds is wrong', () => {
    const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => 0);
    const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => BigInt(0));
    const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
    bridgeIds.push(randomBytes(32));
    const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => BigInt(0));
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
          defiInteractionNotes,
          randomBytes(32),
          randomBytes(32),
          1,
          [randomInnerProofData()],
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

  it('should have correct deposit sum', () => {
    const inners = [randomDepositProofData(), randomDepositProofData()];
    const rollupProofData = createRollupProofData(inners);
    const expected = inners.map(i => new RollupDepositProofData(i)).reduce((a, i) => a + i.publicValue, BigInt(0));
    expect(rollupProofData.getTotalDeposited(0)).toEqual(expected);
  });

  it('should get tx ids from buffer', () => {
    const inners = [randomDepositProofData(), randomDepositProofData()];
    const rollupProofData = createRollupProofData(inners);
    const expected = rollupProofData.innerProofData.filter(i => !i.isPadding()).map(i => i.txId);
    const txIds = RollupProofData.getTxIdsFromBuffer(rollupProofData.toBuffer());
    expect(txIds).toEqual(expected);
  });
});
