import { AssetId, AssetIds } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId, BitConfig } from '@aztec/barretenberg/bridge_id';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { randomBytes } from 'crypto';
import { TxDao } from './entity/tx';
import { RollupCreator } from './rollup_creator';
import { RollupDb } from './rollup_db';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { ProofGenerator, TxRollupProofRequest } from 'halloumi/proof_generator';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { Metrics } from './metrics';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TxFeeResolver } from './tx_fee_resolver';

jest.useFakeTimers();

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const randomInt = (to = 2 ** 32 - 1) => Math.floor(Math.random() * (to + 1));

const buildHashPath = (value: number) => {
  const path = HashPath.fromBuffer(Buffer.concat([numToUInt32BE(32), Buffer.alloc(64 * 32, value)]));
  return path;
};

const getFees = (numTxs: number) =>
  [...Array(numTxs)].map(() => {
    const num = randomInt(100) + 10;
    const large = BigInt(num);
    const ret = large / 2n;
    return ret * 2n;
  });

const EMPTY_HASH_PATH = buildHashPath(99);
const DATA_TREE_SIZE = 99n;
const ROLLUP_ID = 52;
const NON_FEE_PAYING_ASSET = 1000;

const buildBridgeId = (address: number) =>
  new BridgeId(address, 1, 0, 1, 0, new BitConfig(false, false, false, false, false, false), 0).toBigInt();
const BRIDGE_1 = buildBridgeId(1);
const BRIDGE_2 = buildBridgeId(2);
const BRIDGE_3 = buildBridgeId(3);

describe('rollup_creator', () => {
  let rollupCreator: RollupCreator;
  let rollupDb: Mockify<RollupDb>;
  let worldStateDb: Mockify<WorldStateDb>;
  let proofGenerator: Mockify<ProofGenerator>;
  let noteAlgorithms: Mockify<NoteAlgorithms>;
  let metrics: Mockify<Metrics>;
  let feeResolver: Mockify<TxFeeResolver>;
  const numInnerRollupTxs = 28;
  const innerRollupSize = 28;
  const outerRollupSize = 2;
  const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

  const notes = new Map<bigint, Buffer>();
  const hashPaths = new Map<bigint, HashPath>();

  const mockTx = (
    id: number,
    {
      txType = TxType.TRANSFER,
      txFeeAssetId = AssetId.ETH,
      txFee = 0n,
      creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime() + id), // ensures txs are ordered by id
      bridgeId = new BridgeId(
        randomInt(),
        1,
        0,
        1,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      ).toBigInt(),
      noteCommitment1 = randomBytes(32),
      noteCommitment2 = randomBytes(32),
      backwardLink = Buffer.alloc(32),
      allowChain = numToUInt32BE(2, 32),
    } = {},
  ) =>
    ({
      id: Buffer.from([id]),
      txType,
      created: creationTime,
      dataRootsIndex: 0,
      proofData: Buffer.concat([
        numToUInt32BE(txTypeToProofId(txType), 32),
        noteCommitment1,
        noteCommitment2,
        randomBytes(6 * 32),
        toBufferBE(txFee, 32),
        numToUInt32BE(txFeeAssetId, 32),
        toBufferBE(bridgeId, 32),
        randomBytes(2 * 32),
        backwardLink,
        allowChain,
      ]),
    } as any as TxDao);

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    rollupDb = {
      getNumRollupProofsBySize: jest.fn().mockReturnValue(0),
      getNextRollupId: jest.fn().mockReturnValue(ROLLUP_ID),
      addRollupProof: jest.fn(),
    } as any;

    worldStateDb = {
      put: jest.fn(),
      getSize: jest.fn().mockReturnValue(DATA_TREE_SIZE),
      getHashPath: jest.fn().mockImplementation((id: RollupTreeId, index: bigint) => {
        return hashPaths.get(index) ?? buildHashPath(Number(index));
      }),
      getRoot: jest.fn().mockReturnValue(Buffer.alloc(32)),
      get: jest.fn().mockImplementation((id: RollupTreeId, index: bigint) => {
        return notes.get(index) ?? Buffer.alloc(32, Number(index));
      }),
    } as any;

    proofGenerator = {
      createProof: jest.fn().mockReturnValue(() => Buffer.alloc(32, 0)),
    } as any;

    metrics = {
      txRollupTimer: jest.fn().mockReturnValue(() => {}),
    } as any;

    noteAlgorithms = {
      claimNoteCompletePartialCommitment: jest.fn(),
    } as any;

    feeResolver = {
      isFeePayingAsset: jest.fn().mockImplementation((assetId: AssetId) => AssetIds.some(x => x === assetId)),
    } as any;

    rollupCreator = new RollupCreator(
      rollupDb,
      worldStateDb as any,
      proofGenerator,
      noteAlgorithms as any,
      numInnerRollupTxs,
      innerRollupSize,
      outerRollupSize,
      metrics as any,
      feeResolver as any,
    );
  });

  describe('returns correct linked commitments', () => {
    it('should return the correct linked commitment for 1 tx', async () => {
      const backwardLink = randomBytes(32);
      notes.set(8n, backwardLink);
      const txs = [mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink })];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(1);
      expect(rollup.linkedCommitmentPaths.length).toBe(1);
      expect(rollup.linkedCommitmentIndices).toEqual([8]);
      expect(rollup.linkedCommitmentPaths).toEqual([buildHashPath(8)]);
    });

    it('should return the zero linked commitment for 1 tx with no backward link', async () => {
      const txs = [mockTx(1, { txType: TxType.TRANSFER })];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(1);
      expect(rollup.linkedCommitmentPaths.length).toBe(1);
      expect(rollup.linkedCommitmentIndices).toEqual([0]);
      expect(rollup.linkedCommitmentPaths).toEqual([EMPTY_HASH_PATH]);
    });

    it('should return the correct linked commitment for 2 txs', async () => {
      const backwardLink1 = randomBytes(32);
      const index1 = 8n;
      notes.set(index1, backwardLink1);
      const backwardLink2 = randomBytes(32);
      const index2 = 10n;
      notes.set(index2, backwardLink2);
      const txs = [
        mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink1 }),
        mockTx(2, { txType: TxType.TRANSFER, backwardLink: backwardLink2 }),
      ];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(2);
      expect(rollup.linkedCommitmentPaths.length).toBe(2);
      expect(rollup.linkedCommitmentIndices).toEqual([8, 10]);
      expect(rollup.linkedCommitmentPaths).toEqual([buildHashPath(8), buildHashPath(10)]);
    });

    it('should return the correct linked commitments for 2 sparse txs', async () => {
      const backwardLink1 = randomBytes(32);
      const index1 = 8n;
      notes.set(index1, backwardLink1);
      const backwardLink2 = randomBytes(32);
      const index2 = 10n;
      notes.set(index2, backwardLink2);
      const txs = [
        mockTx(0, { txType: TxType.TRANSFER }),
        mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink1 }),
        mockTx(2, { txType: TxType.TRANSFER }),
        mockTx(3, { txType: TxType.TRANSFER, backwardLink: backwardLink2 }),
      ];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(4);
      expect(rollup.linkedCommitmentPaths.length).toBe(4);
      expect(rollup.linkedCommitmentIndices).toEqual([0, 8, 0, 10]);
      expect(rollup.linkedCommitmentPaths).toEqual([
        EMPTY_HASH_PATH,
        buildHashPath(8),
        EMPTY_HASH_PATH,
        buildHashPath(10),
      ]);
    });

    it('should return the correct linked commitment for 2 sparse txs in reverse order', async () => {
      const backwardLink1 = randomBytes(32);
      const index1 = 8n;
      notes.set(index1, backwardLink1);
      const backwardLink2 = randomBytes(32);
      const index2 = 10n;
      notes.set(index2, backwardLink2);
      const txs = [
        mockTx(0, { txType: TxType.TRANSFER }),
        mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink2 }),
        mockTx(2, { txType: TxType.TRANSFER }),
        mockTx(3, { txType: TxType.TRANSFER, backwardLink: backwardLink1 }),
      ];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(4);
      expect(rollup.linkedCommitmentPaths.length).toBe(4);
      expect(rollup.linkedCommitmentIndices).toEqual([0, 10, 0, 8]);
      expect(rollup.linkedCommitmentPaths).toEqual([
        EMPTY_HASH_PATH,
        buildHashPath(10),
        EMPTY_HASH_PATH,
        buildHashPath(8),
      ]);
    });

    it('should return the correct linked commitment for 3 sparse txs in reverse order', async () => {
      const backwardLink1 = randomBytes(32);
      const index1 = 8n;
      notes.set(index1, backwardLink1);
      const backwardLink2 = randomBytes(32);
      const index2 = 10n;
      notes.set(index2, backwardLink2);
      const backwardLink3 = randomBytes(32);
      const index3 = 15n;
      notes.set(index3, backwardLink3);
      const txs = [
        mockTx(0, { txType: TxType.TRANSFER }),
        mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink3 }),
        mockTx(2, { txType: TxType.TRANSFER }),
        mockTx(3, { txType: TxType.TRANSFER, backwardLink: backwardLink2 }),
        mockTx(4, { txType: TxType.TRANSFER }),
        mockTx(5, { txType: TxType.TRANSFER }),
        mockTx(6, { txType: TxType.TRANSFER, backwardLink: backwardLink1 }),
        mockTx(7, { txType: TxType.TRANSFER }),
      ];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(8);
      expect(rollup.linkedCommitmentPaths.length).toBe(8);
      expect(rollup.linkedCommitmentIndices).toEqual([0, 15, 0, 10, 0, 0, 8, 0]);
      expect(rollup.linkedCommitmentPaths).toEqual([
        EMPTY_HASH_PATH,
        buildHashPath(15),
        EMPTY_HASH_PATH,
        buildHashPath(10),
        EMPTY_HASH_PATH,
        EMPTY_HASH_PATH,
        buildHashPath(8),
        EMPTY_HASH_PATH,
      ]);
    });

    it('should return the correct empty hash paths for linked commitments within given txs', async () => {
      const backwardLink1 = randomBytes(32);
      const index1 = 8n;
      notes.set(index1, backwardLink1);
      const backwardLink2 = randomBytes(32);
      const index2 = 10n;
      notes.set(index2, backwardLink2);
      const backwardLink3 = randomBytes(32);
      const index3 = 15n;
      notes.set(index3, backwardLink3);
      const chainNote1 = randomBytes(32);
      const chainNote2 = randomBytes(32);
      const chainNote1Index = 11n;
      notes.set(chainNote1Index, chainNote1);
      const chainNote2Index = 13n;
      notes.set(chainNote2Index, chainNote2);
      const txs = [
        mockTx(0, { txType: TxType.TRANSFER }),
        mockTx(1, { txType: TxType.TRANSFER, backwardLink: backwardLink3 }),
        mockTx(2, { txType: TxType.TRANSFER }),
        mockTx(3, { txType: TxType.TRANSFER, noteCommitment1: chainNote1, backwardLink: backwardLink2 }),
        mockTx(2, { txType: TxType.TRANSFER }),
        mockTx(4, { txType: TxType.TRANSFER, noteCommitment2: chainNote2, backwardLink: chainNote1 }),
        mockTx(5, { txType: TxType.TRANSFER, backwardLink: chainNote2 }),
        mockTx(6, { txType: TxType.TRANSFER, backwardLink: backwardLink1 }),
        mockTx(7, { txType: TxType.TRANSFER }),
      ];
      await rollupCreator.create(txs, [], new Set<AssetId>([AssetId.ETH]));
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.linkedCommitmentIndices.length).toBe(9);
      expect(rollup.linkedCommitmentPaths.length).toBe(9);
      expect(rollup.linkedCommitmentIndices).toEqual([0, 15, 0, 10, 0, 0, 0, 8, 0]);
      expect(rollup.linkedCommitmentPaths).toEqual([
        EMPTY_HASH_PATH,
        buildHashPath(15),
        EMPTY_HASH_PATH,
        buildHashPath(10),
        EMPTY_HASH_PATH, // links to chainNote1 which is noteCommitment1 of previous tx within the input
        EMPTY_HASH_PATH,
        EMPTY_HASH_PATH, // links to chainNote2 which is noteCommitment2 of previous tx within the input
        buildHashPath(8),
        EMPTY_HASH_PATH,
      ]);
    });

    it('should assign the correct nonce to 1 defi tx', async () => {
      const numTxs = 1;
      const commitments = [...Array(numTxs)].map(() => randomBytes(32));
      const fees = getFees(numTxs);
      const bridges = [BRIDGE_1];
      const globalBridges = [BRIDGE_1];
      const txs = [...Array(numTxs)].map((_, i) =>
        mockTx(i + 1, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridges[i],
          noteCommitment1: commitments[i],
          txFee: BigInt(fees[i]),
        }),
      );
      await rollupCreator.create(txs, globalBridges, new Set<AssetId>([AssetId.ETH]));
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment.mock.calls[0]).toEqual([
        commitments[0],
        ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK,
        fees[0] / 2n,
      ]);
      expect(rollup.bridgeIds).toEqual(globalBridges.map(x => toBufferBE(x, 32)));
    });

    it('should assign the correct nonce to 2 txs for the same bridge', async () => {
      const numTxs = 2;
      const commitments = [...Array(numTxs)].map(() => randomBytes(32));
      const fees = getFees(numTxs);
      const bridges = [BRIDGE_1, BRIDGE_1];
      const globalBridges = [BRIDGE_1];
      const txs = [...Array(numTxs)].map((_, i) =>
        mockTx(i + 1, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridges[i],
          noteCommitment1: commitments[i],
          txFee: BigInt(fees[i]),
        }),
      );
      await rollupCreator.create(txs, globalBridges, new Set<AssetId>([AssetId.ETH]));
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment).toHaveBeenCalledTimes(2);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment.mock.calls).toEqual([
        [commitments[0], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[0] / 2n],
        [commitments[1], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[1] / 2n],
      ]);
      expect(rollup.bridgeIds).toEqual(globalBridges.map(x => toBufferBE(x, 32)));
    });

    it('should assign the correct nonce to 2 txs for different bridges', async () => {
      const numTxs = 2;
      const commitments = [...Array(numTxs)].map(() => randomBytes(32));
      const fees = getFees(numTxs);
      const bridges = [BRIDGE_1, BRIDGE_2];
      const globalBridges = [BRIDGE_1, BRIDGE_2];
      const txs = [...Array(numTxs)].map((_, i) =>
        mockTx(i + 1, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridges[i],
          noteCommitment1: commitments[i],
          txFee: BigInt(fees[i]),
        }),
      );
      await rollupCreator.create(txs, globalBridges, new Set<AssetId>([AssetId.ETH]));
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment).toHaveBeenCalledTimes(2);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment.mock.calls).toEqual([
        [commitments[0], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[0] / 2n],
        [commitments[1], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 1, fees[1] / 2n],
      ]);
      expect(rollup.bridgeIds).toEqual(globalBridges.map(x => toBufferBE(x, 32)));
    });

    it('should assign the correct nonce to 2 txs for different bridges in different order', async () => {
      const numTxs = 2;
      const commitments = [...Array(numTxs)].map(() => randomBytes(32));
      const fees = getFees(numTxs);
      const bridges = [BRIDGE_1, BRIDGE_2];
      const globalBridges = [BRIDGE_2, BRIDGE_1];
      const txs = [...Array(numTxs)].map((_, i) =>
        mockTx(i + 1, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridges[i],
          noteCommitment1: commitments[i],
          txFee: BigInt(fees[i]),
        }),
      );
      await rollupCreator.create(txs, globalBridges, new Set<AssetId>([AssetId.ETH]));
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment).toHaveBeenCalledTimes(2);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment.mock.calls).toEqual([
        [commitments[0], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 1, fees[0] / 2n],
        [commitments[1], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[1] / 2n],
      ]);
      expect(rollup.bridgeIds).toEqual(globalBridges.map(x => toBufferBE(x, 32)));
    });

    it('should assign the correct nonce to multiple txs for different bridges in different order', async () => {
      const numTxs = 8;
      const commitments = [...Array(numTxs)].map(() => randomBytes(32));
      const fees = getFees(numTxs);
      const bridges = [BRIDGE_1, BRIDGE_3, BRIDGE_1, BRIDGE_2, BRIDGE_3, BRIDGE_2, BRIDGE_3, BRIDGE_1];
      const globalBridges = [BRIDGE_2, BRIDGE_1, BRIDGE_3];
      const txs = [...Array(numTxs)].map((_, i) =>
        mockTx(i + 1, {
          txType: TxType.DEFI_DEPOSIT,
          bridgeId: bridges[i],
          noteCommitment1: commitments[i],
          txFee: BigInt(fees[i]),
        }),
      );
      await rollupCreator.create(txs, globalBridges, new Set<AssetId>([AssetId.ETH]));
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment).toHaveBeenCalledTimes(8);
      expect(noteAlgorithms.claimNoteCompletePartialCommitment.mock.calls).toEqual([
        [commitments[0], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 1, fees[0] / 2n],
        [commitments[1], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 2, fees[1] / 2n],
        [commitments[2], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 1, fees[2] / 2n],
        [commitments[3], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[3] / 2n],
        [commitments[4], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 2, fees[4] / 2n],
        [commitments[5], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK, fees[5] / 2n],
        [commitments[6], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 2, fees[6] / 2n],
        [commitments[7], ROLLUP_ID * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 1, fees[7] / 2n],
      ]);
      expect(rollup.bridgeIds).toEqual(globalBridges.map(x => toBufferBE(x, 32)));
    });

    it('should add assets to root rollup assets', async () => {
      const txs = [
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.ETH }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.DAI }),
        mockTx(3, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.ETH }),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.DAI }),
      ];
      const rootAssets = new Set<AssetId>();
      await rollupCreator.create(txs, [], rootAssets);
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.assetIds.map(buf => buf.readUInt32BE(28))).toEqual([AssetId.ETH, AssetId.DAI]);
      expect([...rootAssets.values()]).toEqual([AssetId.ETH, AssetId.DAI]);
    });

    it('should add assets to root rollup assets', async () => {
      const txs = [
        mockTx(1, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.ETH }),
        mockTx(2, { txType: TxType.TRANSFER, txFeeAssetId: NON_FEE_PAYING_ASSET }),
        mockTx(3, { txType: TxType.TRANSFER, txFeeAssetId: AssetId.DAI }),
        mockTx(4, { txType: TxType.TRANSFER, txFeeAssetId: NON_FEE_PAYING_ASSET + 1 }),
      ];
      const rootAssets = new Set<AssetId>();
      await rollupCreator.create(txs, [], rootAssets);
      expect(proofGenerator.createProof).toHaveBeenCalledTimes(1);
      const argument = proofGenerator.createProof.mock.calls[0][0];
      const request = TxRollupProofRequest.fromBuffer(argument);
      const rollup = request.txRollup;
      expect(rollup.assetIds.map(buf => buf.readUInt32BE(28))).toEqual([AssetId.ETH, AssetId.DAI]);
      expect([...rootAssets.values()]).toEqual([AssetId.ETH, AssetId.DAI]);
    });
  });
});
