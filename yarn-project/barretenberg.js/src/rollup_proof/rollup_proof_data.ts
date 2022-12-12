import { sha256 } from '../crypto/index.js';
import { createTxId, ProofId } from '../client_proofs/index.js';
import { numToUInt32BE } from '../serialize/index.js';
import { decodeInnerProof } from './decode_inner_proof.js';
import { encodeInnerProof } from './encode_inner_proof.js';
import { InnerProofData } from './inner_proof.js';
import { RollupDepositProofData, RollupWithdrawProofData } from './index.js';
import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';

const NUM_FEE_ASSETS_PER_BLOCK = 16;
const NUM_BRIDGE_CALLS_PER_BLOCK = 32;

export enum RollupProofDataFields {
  ROLLUP_ID,
  ROLLUP_SIZE,
  DATA_START_INDEX,
  OLD_DATA_ROOT,
  NEW_DATA_ROOT,
  OLD_NULL_ROOT,
  NEW_NULL_ROOT,
  OLD_ROOT_ROOT,
  NEW_ROOT_ROOT,
  OLD_DEFI_ROOT,
  NEW_DEFI_ROOT,
  BRIDGE_CALL_DATAS,
  DEFI_DEPOSIT_SUMS = BRIDGE_CALL_DATAS + NUM_BRIDGE_CALLS_PER_BLOCK,
  FEE_ASSET_IDS = DEFI_DEPOSIT_SUMS + NUM_BRIDGE_CALLS_PER_BLOCK,
  FEE_SUMS = FEE_ASSET_IDS + NUM_FEE_ASSETS_PER_BLOCK,
  DEFI_INTERACTIONS = FEE_SUMS + NUM_FEE_ASSETS_PER_BLOCK,
  PREV_DEFI_INTERACTION_HASH = DEFI_INTERACTIONS + NUM_BRIDGE_CALLS_PER_BLOCK,
  ROLLUP_BENEFICIARY = PREV_DEFI_INTERACTION_HASH + 1,
  NUM_ROLLUP_TXS = ROLLUP_BENEFICIARY + 1,
}

export enum RollupProofDataOffsets {
  ROLLUP_ID = RollupProofDataFields.ROLLUP_ID * 32 + 28,
  ROLLUP_SIZE = RollupProofDataFields.ROLLUP_SIZE * 32 + 28,
  DATA_START_INDEX = RollupProofDataFields.DATA_START_INDEX * 32 + 28,
  OLD_DATA_ROOT = RollupProofDataFields.OLD_DATA_ROOT * 32,
  NEW_DATA_ROOT = RollupProofDataFields.NEW_DATA_ROOT * 32,
  OLD_NULL_ROOT = RollupProofDataFields.OLD_NULL_ROOT * 32,
  NEW_NULL_ROOT = RollupProofDataFields.NEW_NULL_ROOT * 32,
  OLD_ROOT_ROOT = RollupProofDataFields.OLD_ROOT_ROOT * 32,
  NEW_ROOT_ROOT = RollupProofDataFields.NEW_ROOT_ROOT * 32,
  OLD_DEFI_ROOT = RollupProofDataFields.OLD_DEFI_ROOT * 32,
  NEW_DEFI_ROOT = RollupProofDataFields.NEW_DEFI_ROOT * 32,
  BRIDGE_CALL_DATAS = RollupProofDataFields.BRIDGE_CALL_DATAS * 32,
  DEFI_DEPOSIT_SUMS = RollupProofDataFields.DEFI_DEPOSIT_SUMS * 32,
  FEE_ASSET_IDS = RollupProofDataFields.FEE_ASSET_IDS * 32,
  FEE_SUMS = RollupProofDataFields.FEE_SUMS * 32,
  DEFI_INTERACTIONS = RollupProofDataFields.DEFI_INTERACTIONS * 32,
  PREV_DEFI_INTERACTION_HASH = RollupProofDataFields.PREV_DEFI_INTERACTION_HASH * 32,
  ROLLUP_BENEFICIARY = RollupProofDataFields.ROLLUP_BENEFICIARY * 32,
  NUM_ROLLUP_TXS = RollupProofDataFields.NUM_ROLLUP_TXS * 32 + 28,
}

const parseHeaderInputs = (proofData: Buffer) => {
  const rollupId = RollupProofData.getRollupIdFromBuffer(proofData);
  const rollupSize = proofData.readUInt32BE(RollupProofDataOffsets.ROLLUP_SIZE);
  const dataStartIndex = proofData.readUInt32BE(RollupProofDataOffsets.DATA_START_INDEX);
  const oldDataRoot = proofData.subarray(
    RollupProofDataOffsets.OLD_DATA_ROOT,
    RollupProofDataOffsets.OLD_DATA_ROOT + 32,
  );
  const newDataRoot = proofData.subarray(
    RollupProofDataOffsets.NEW_DATA_ROOT,
    RollupProofDataOffsets.NEW_DATA_ROOT + 32,
  );
  const oldNullRoot = proofData.subarray(
    RollupProofDataOffsets.OLD_NULL_ROOT,
    RollupProofDataOffsets.OLD_NULL_ROOT + 32,
  );
  const newNullRoot = proofData.subarray(
    RollupProofDataOffsets.NEW_NULL_ROOT,
    RollupProofDataOffsets.NEW_NULL_ROOT + 32,
  );
  const oldDataRootsRoot = proofData.subarray(
    RollupProofDataOffsets.OLD_ROOT_ROOT,
    RollupProofDataOffsets.OLD_ROOT_ROOT + 32,
  );
  const newDataRootsRoot = proofData.subarray(
    RollupProofDataOffsets.NEW_ROOT_ROOT,
    RollupProofDataOffsets.NEW_ROOT_ROOT + 32,
  );
  const oldDefiRoot = proofData.subarray(
    RollupProofDataOffsets.OLD_DEFI_ROOT,
    RollupProofDataOffsets.OLD_DEFI_ROOT + 32,
  );
  const newDefiRoot = proofData.subarray(
    RollupProofDataOffsets.NEW_DEFI_ROOT,
    RollupProofDataOffsets.NEW_DEFI_ROOT + 32,
  );

  const bridgeCallDatas = RollupProofData.getBridgeCallDatas(proofData);

  const defiDepositSums: bigint[] = [];
  for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
    const startIndex = RollupProofDataOffsets.DEFI_DEPOSIT_SUMS + i * 32;
    defiDepositSums.push(toBigIntBE(proofData.subarray(startIndex, startIndex + 32)));
  }

  const assetIds: number[] = [];
  for (let i = 0; i < RollupProofData.NUMBER_OF_ASSETS; ++i) {
    const startIndex = RollupProofDataOffsets.FEE_ASSET_IDS + i * 32;
    assetIds.push(proofData.readUInt32BE(startIndex + 28));
  }

  const totalTxFees: bigint[] = [];
  for (let i = 0; i < RollupProofData.NUMBER_OF_ASSETS; ++i) {
    const startIndex = RollupProofDataOffsets.FEE_SUMS + i * 32;
    totalTxFees.push(toBigIntBE(proofData.subarray(startIndex, startIndex + 32)));
  }

  const defiInteractionNotes: Buffer[] = [];
  for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
    const startIndex = RollupProofDataOffsets.DEFI_INTERACTIONS + i * 32;
    defiInteractionNotes.push(proofData.subarray(startIndex, startIndex + 32));
  }

  const prevDefiInteractionHash = proofData.subarray(
    RollupProofDataOffsets.PREV_DEFI_INTERACTION_HASH,
    RollupProofDataOffsets.PREV_DEFI_INTERACTION_HASH + 32,
  );

  const rollupBeneficiary = proofData.subarray(
    RollupProofDataOffsets.ROLLUP_BENEFICIARY,
    RollupProofDataOffsets.ROLLUP_BENEFICIARY + 32,
  );

  const numRollupTxs = proofData.readUInt32BE(RollupProofDataOffsets.NUM_ROLLUP_TXS);

  return {
    rollupId,
    rollupSize,
    dataStartIndex,
    oldDataRoot,
    newDataRoot,
    oldNullRoot,
    newNullRoot,
    oldDataRootsRoot,
    newDataRootsRoot,
    oldDefiRoot,
    newDefiRoot,
    bridgeCallDatas,
    defiDepositSums,
    assetIds,
    totalTxFees,
    defiInteractionNotes,
    prevDefiInteractionHash,
    rollupBeneficiary,
    numRollupTxs,
  };
};

export class RollupProofData {
  static NUMBER_OF_ASSETS = NUM_FEE_ASSETS_PER_BLOCK;
  static NUM_BRIDGE_CALLS_PER_BLOCK = NUM_BRIDGE_CALLS_PER_BLOCK;
  static NUM_ROLLUP_HEADER_INPUTS =
    // 14 single field header fields.
    14 +
    // Fee asset ids, and fee sums.
    RollupProofData.NUMBER_OF_ASSETS * 2 +
    // Bridge call data, bridge deposit sums, and defi interaction commitments.
    RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * 3;
  static LENGTH_ROLLUP_HEADER_INPUTS = RollupProofData.NUM_ROLLUP_HEADER_INPUTS * 32;
  public rollupHash_?: Buffer;

  constructor(
    public rollupId: number,
    public rollupSize: number,
    public dataStartIndex: number,
    public oldDataRoot: Buffer,
    public newDataRoot: Buffer,
    public oldNullRoot: Buffer,
    public newNullRoot: Buffer,
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDefiRoot: Buffer,
    public newDefiRoot: Buffer,
    public bridgeCallDatas: Buffer[],
    public defiDepositSums: bigint[],
    public assetIds: number[],
    public totalTxFees: bigint[],
    public defiInteractionNotes: Buffer[],
    public prevDefiInteractionHash: Buffer,
    public rollupBeneficiary: Buffer,
    public numRollupTxs: number,
    public innerProofData: InnerProofData[],
  ) {
    if (bridgeCallDatas.length !== RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      throw new Error(`Expect bridgeCallDatas to be an array of size ${RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK}.`);
    }
    if (defiDepositSums.length !== RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      throw new Error(`Expect defiDepositSums to be an array of size ${RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK}.`);
    }
    if (totalTxFees.length !== RollupProofData.NUMBER_OF_ASSETS) {
      throw new Error(`Expect totalTxFees to be an array of size ${RollupProofData.NUMBER_OF_ASSETS}.`);
    }
    if (defiInteractionNotes.length !== RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK) {
      throw new Error(
        `Expect defiInteractionNotes to be an array of size ${RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK}.`,
      );
    }
  }

  public get rollupHash(): Buffer {
    if (!this.rollupHash_) {
      const allTxIds = this.innerProofData.map(innerProof => innerProof.txId);
      this.rollupHash_ = sha256(Buffer.concat(allTxIds));
    }
    return this.rollupHash_;
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.rollupId, 32),
      numToUInt32BE(this.rollupSize, 32),
      numToUInt32BE(this.dataStartIndex, 32),
      this.oldDataRoot,
      this.newDataRoot,
      this.oldNullRoot,
      this.newNullRoot,
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDefiRoot,
      this.newDefiRoot,
      ...this.bridgeCallDatas,
      ...this.defiDepositSums.map(v => toBufferBE(v, 32)),
      ...this.assetIds.map(a => numToUInt32BE(a, 32)),
      ...this.totalTxFees.map(a => toBufferBE(a, 32)),
      ...this.defiInteractionNotes,
      this.prevDefiInteractionHash,
      this.rollupBeneficiary,
      numToUInt32BE(this.numRollupTxs, 32),
      ...this.innerProofData.map(p => p.toBuffer()),
    ]);
  }

  getTotalDeposited(assetId: number) {
    return this.innerProofData
      .filter(p => p.proofId === ProofId.DEPOSIT)
      .map(p => new RollupDepositProofData(p))
      .filter(p => p.assetId == assetId)
      .reduce((a: bigint, p) => a + p.publicValue, BigInt(0));
  }

  getTotalWithdrawn(assetId: number) {
    return this.innerProofData
      .filter(p => p.proofId === ProofId.WITHDRAW)
      .map(p => new RollupWithdrawProofData(p))
      .filter(p => p.assetId == assetId)
      .reduce((a: bigint, p) => a + p.publicValue, BigInt(0));
  }

  getTotalDefiDeposit(assetId: number) {
    return this.bridgeCallDatas
      .map((bridgeCallData, i) => {
        if (
          BridgeCallData.fromBuffer(bridgeCallData).inputAssetIdA === assetId ||
          BridgeCallData.fromBuffer(bridgeCallData).inputAssetIdB === assetId
        ) {
          return this.defiDepositSums[i];
        } else {
          return BigInt(0);
        }
      })
      .reduce((acc, val) => acc + val, BigInt(0));
  }

  getTotalFees(assetId: number) {
    const index = this.assetIds.indexOf(assetId);
    return index < 0 ? BigInt(0) : this.totalTxFees[index];
  }

  encode() {
    let lastNonEmptyIndex = 0;
    this.innerProofData.forEach((p, i) => {
      if (p.proofId !== ProofId.PADDING) {
        lastNonEmptyIndex = i;
      }
    });

    const numRealTxns = lastNonEmptyIndex + 1;
    const encodedInnerProof = this.innerProofData.filter((p, i) => i < numRealTxns).map(p => encodeInnerProof(p));
    return Buffer.concat([
      numToUInt32BE(this.rollupId, 32),
      numToUInt32BE(this.rollupSize, 32),
      numToUInt32BE(this.dataStartIndex, 32),
      this.oldDataRoot,
      this.newDataRoot,
      this.oldNullRoot,
      this.newNullRoot,
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDefiRoot,
      this.newDefiRoot,
      ...this.bridgeCallDatas,
      ...this.defiDepositSums.map(v => toBufferBE(v, 32)),
      ...this.assetIds.map(a => numToUInt32BE(a, 32)),
      ...this.totalTxFees.map(a => toBufferBE(a, 32)),
      ...this.defiInteractionNotes,
      this.prevDefiInteractionHash,
      this.rollupBeneficiary,
      numToUInt32BE(this.numRollupTxs, 32),
      numToUInt32BE(numRealTxns),
      numToUInt32BE(Buffer.concat(encodedInnerProof).length),
      ...encodedInnerProof,
    ]);
  }

  static getRollupIdFromBuffer(proofData: Buffer) {
    return proofData.readUInt32BE(RollupProofDataOffsets.ROLLUP_ID);
  }

  static getRollupSizeFromBuffer(proofData: Buffer) {
    return proofData.readUInt32BE(RollupProofDataOffsets.ROLLUP_SIZE);
  }

  static getTxIdsFromBuffer(proofData: Buffer) {
    const rollupSize = RollupProofData.getRollupSizeFromBuffer(proofData);
    const startIndex = RollupProofData.LENGTH_ROLLUP_HEADER_INPUTS;
    return Array.from({ length: rollupSize })
      .map((_, i) => {
        const innerProofStart = startIndex + i * InnerProofData.LENGTH;
        return createTxId(proofData.subarray(innerProofStart, innerProofStart + InnerProofData.LENGTH));
      })
      .filter(id => !id.equals(InnerProofData.PADDING.txId));
  }

  static getBridgeCallDatas(proofData: Buffer) {
    const bridgeCallDatas: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
      const startIndex = RollupProofDataOffsets.BRIDGE_CALL_DATAS + i * 32;
      bridgeCallDatas.push(proofData.subarray(startIndex, startIndex + 32));
    }
    return bridgeCallDatas;
  }

  public getNonPaddingProofs() {
    return this.innerProofData.filter(proofData => !proofData.isPadding());
  }

  public getNonPaddingTxIds() {
    return this.getNonPaddingProofs().map(proof => proof.txId);
  }

  public getNonPaddingProofIds() {
    return this.getNonPaddingProofs().map(proof => proof.proofId);
  }

  static fromBuffer(proofData: Buffer) {
    const {
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDefiRoot,
      newDefiRoot,
      bridgeCallDatas,
      defiDepositSums,
      assetIds,
      totalTxFees,
      defiInteractionNotes,
      prevDefiInteractionHash,
      rollupBeneficiary,
      numRollupTxs,
    } = parseHeaderInputs(proofData);

    if (!rollupSize) {
      throw new Error('Empty rollup.');
    }

    let startIndex = RollupProofData.LENGTH_ROLLUP_HEADER_INPUTS;
    const innerProofData: InnerProofData[] = [];
    for (let i = 0; i < rollupSize; ++i) {
      const innerData = proofData.subarray(startIndex, startIndex + InnerProofData.LENGTH);
      innerProofData[i] = InnerProofData.fromBuffer(innerData);
      startIndex += InnerProofData.LENGTH;
    }

    return new RollupProofData(
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDefiRoot,
      newDefiRoot,
      bridgeCallDatas,
      defiDepositSums,
      assetIds,
      totalTxFees,
      defiInteractionNotes,
      prevDefiInteractionHash,
      rollupBeneficiary,
      numRollupTxs,
      innerProofData,
    );
  }

  static randomData(
    rollupId: number,
    numTxs: number,
    dataStartIndex = 0,
    innerProofData?: InnerProofData[],
    bridgeCallDatas: BridgeCallData[] = [],
  ) {
    const ipd =
      innerProofData === undefined
        ? new Array(numTxs).fill(0).map(() => InnerProofData.fromBuffer(Buffer.alloc(InnerProofData.LENGTH)))
        : innerProofData;

    return new RollupProofData(
      rollupId,
      numTxs,
      dataStartIndex,
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      bridgeCallDatas
        .map(b => b.toBuffer())
        .concat(
          new Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK - bridgeCallDatas.length)
            .fill(0)
            .map(() => Buffer.alloc(32)),
        ),
      new Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(BigInt(0)),
      new Array(RollupProofData.NUMBER_OF_ASSETS).fill(0),
      new Array(RollupProofData.NUMBER_OF_ASSETS).fill(BigInt(0)),
      new Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(0).map(() => Buffer.alloc(32)),
      Buffer.alloc(32),
      Buffer.alloc(32),
      ipd.length,
      ipd,
    );
  }

  static decode(encoded: Buffer) {
    const {
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDefiRoot,
      newDefiRoot,
      bridgeCallDatas,
      defiDepositSums,
      assetIds,
      totalTxFees,
      defiInteractionNotes,
      prevDefiInteractionHash,
      rollupBeneficiary,
      numRollupTxs,
    } = parseHeaderInputs(encoded);

    if (!rollupSize) {
      throw new Error('Empty rollup.');
    }

    let startIndex = RollupProofData.LENGTH_ROLLUP_HEADER_INPUTS;
    startIndex += 4; // skip over numRealTxs
    let innerProofDataLength = encoded.readUInt32BE(startIndex);
    startIndex += 4;
    const innerProofData: InnerProofData[] = [];
    while (innerProofDataLength > 0) {
      const innerProof = decodeInnerProof(encoded.subarray(startIndex));
      innerProofData.push(innerProof.proofData);
      startIndex += innerProof.ENCODED_LENGTH;
      innerProofDataLength -= innerProof.ENCODED_LENGTH;
    }
    for (let i = innerProofData.length; i < rollupSize; ++i) {
      innerProofData.push(InnerProofData.PADDING);
    }

    return new RollupProofData(
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDefiRoot,
      newDefiRoot,
      bridgeCallDatas,
      defiDepositSums,
      assetIds,
      totalTxFees,
      defiInteractionNotes,
      prevDefiInteractionHash,
      rollupBeneficiary,
      numRollupTxs,
      innerProofData,
    );
  }
}
