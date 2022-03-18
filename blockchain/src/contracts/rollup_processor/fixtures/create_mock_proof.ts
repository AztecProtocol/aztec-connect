import { AccountAliasId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import {
  OffchainAccountData,
  OffchainDefiClaimData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { Keccak } from 'sha3';
import { EthersAdapter } from '../../../provider';
import { Web3Signer } from '../../../signer';

const numToBuffer = (num: number) => numToUInt32BE(num, 32);

const randomLeafHash = () => randomBytes(32);

const randomNullifier = () => Buffer.concat([Buffer.alloc(16), randomBytes(16)]);

const MAX_NUMBER_OF_ROLLUPS_PER_TEST = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + 10; // arbitrary choice of 10. We currently have a test that uses numberOfBridgeCalls + 3...

const extendRoots = (roots: Buffer[], size = MAX_NUMBER_OF_ROLLUPS_PER_TEST) => [
  ...roots,
  ...[...Array(size - roots.length)].map(() => randomBytes(32)),
];

const dataRoots = extendRoots([WorldStateConstants.EMPTY_DATA_ROOT]);
const nullifierRoots = extendRoots([WorldStateConstants.EMPTY_NULL_ROOT]);
const dataRootRoots = extendRoots([WorldStateConstants.EMPTY_ROOT_ROOT]);
const defiRoots = extendRoots([WorldStateConstants.EMPTY_DEFI_ROOT]);

class InnerProofOutput {
  constructor(
    public innerProofs: InnerProofData[],
    public signatures: Buffer[],
    public totalTxFees: bigint[],
    public offchainTxData: Buffer[],
  ) {}
}

export const createDepositProof = async (
  amount: bigint,
  depositorAddress: EthAddress,
  user: Signer,
  assetId: number,
  txFee = 0n,
) => {
  const innerProof = new InnerProofData(
    ProofId.DEPOSIT,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    toBufferBE(amount + txFee, 32),
    depositorAddress.toBuffer32(),
    numToBuffer(assetId),
  );
  const userAddr = EthAddress.fromString(await user.getAddress());
  const message = new TxId(innerProof.txId).toDepositSigningData();
  const signature = await new Web3Signer(new EthersAdapter(user)).signMessage(message, userAddr);

  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  const offchainTxData = new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random()]);

  return new InnerProofOutput([innerProof], [signature], totalTxFees, [offchainTxData.toBuffer()]);
};

export const createWithdrawProof = (amount: bigint, withdrawalAddress: EthAddress, assetId: number, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.WITHDRAW,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    toBufferBE(amount + txFee, 32),
    withdrawalAddress.toBuffer32(),
    numToBuffer(assetId),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  const offchainTxData = new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random()]);

  return new InnerProofOutput([innerProof], [], totalTxFees, [offchainTxData.toBuffer()]);
};

export const createSendProof = (assetId = 1, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.SEND,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  const offchainTxData = new OffchainJoinSplitData([ViewingKey.random(), ViewingKey.random()]);

  return new InnerProofOutput([innerProof], [], totalTxFees, [offchainTxData.toBuffer()]);
};

export const createAccountProof = () => {
  const innerProof = new InnerProofData(
    ProofId.ACCOUNT,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );

  const offchainTxData = new OffchainAccountData(GrumpkinAddress.randomAddress(), AccountAliasId.random());

  return new InnerProofOutput([innerProof], [], [], [offchainTxData.toBuffer()]);
};

export const createDefiDepositProof = (bridgeId: BridgeId, inputValue: bigint, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.DEFI_DEPOSIT,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[bridgeId.inputAssetIdA] = txFee;

  const offchainTxData = new OffchainDefiDepositData(
    bridgeId,
    randomBytes(32),
    new GrumpkinAddress(randomBytes(64)),
    inputValue,
    txFee,
    ViewingKey.random(),
  );

  return new InnerProofOutput([innerProof], [], totalTxFees, [offchainTxData.toBuffer()]);
};

export const createDefiClaimProof = (bridgeId: BridgeId, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.DEFI_CLAIM,
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[bridgeId.inputAssetIdA] = txFee;

  const offchainTxData = new OffchainDefiClaimData();

  return new InnerProofOutput([innerProof], [], totalTxFees, [offchainTxData.toBuffer()]);
};

export const mergeInnerProofs = (output: InnerProofOutput[]) => {
  const totalTxFees: bigint[] = [];
  output.forEach(o => {
    o.totalTxFees.forEach((fee, assetId) => (totalTxFees[assetId] = fee + (totalTxFees[assetId] || 0n)));
  });
  return new InnerProofOutput(
    output.map(o => o.innerProofs).flat(),
    output
      .map(o => o.signatures)
      .filter(s => s)
      .flat(),
    totalTxFees,
    output.map(o => o.offchainTxData).flat(),
  );
};

export class DefiInteractionData {
  static EMPTY = new DefiInteractionData(BridgeId.ZERO, BigInt(0));

  constructor(public readonly bridgeId: BridgeId, public readonly totalInputValue: bigint) {}
}

interface RollupProofOptions {
  rollupId?: number;
  rollupSize?: number;
  dataStartIndex?: number;
  numberOfAssets?: number;
  numberOfDefiInteraction?: number;
  previousDefiInteractionHash?: Buffer;
  defiInteractionData?: DefiInteractionData[];
  prevInteractionResult?: Buffer[];
  feeLimit?: bigint;
  feeDistributorAddress?: EthAddress;
}

export const createSigData = (
  proofData: Buffer,
  providerAddress: EthAddress,
  feeLimit: bigint,
  feeDistributorAddress: EthAddress,
) => {
  const message = Buffer.concat([
    proofData.slice(0, RollupProofData.LENGTH_ROLLUP_HEADER_INPUTS),
    providerAddress.toBuffer(),
    toBufferBE(feeLimit, 32),
    feeDistributorAddress.toBuffer(),
  ]);
  return new Keccak(256).update(message).digest();
};

export const createRollupProof = async (
  rollupProvider: Signer,
  innerProofOutput: InnerProofOutput,
  {
    rollupId = 0,
    rollupSize = 2,
    dataStartIndex,
    numberOfAssets = RollupProofData.NUMBER_OF_ASSETS,
    numberOfDefiInteraction = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK,
    previousDefiInteractionHash,
    defiInteractionData = [],
    prevInteractionResult = [],
    feeDistributorAddress = EthAddress.randomAddress(),
  }: RollupProofOptions = {},
) => {
  const { innerProofs, totalTxFees, offchainTxData } = innerProofOutput;

  const dataStartIndexBuf = numToBuffer(dataStartIndex === undefined ? rollupId * rollupSize * 2 : dataStartIndex);

  const totalTxFeePublicInputs = totalTxFees.filter(fee => fee).map(fee => toBufferBE(fee, 32));
  for (let i = totalTxFeePublicInputs.length; i < numberOfAssets; ++i) {
    totalTxFeePublicInputs.push(toBufferBE(0n, 32));
  }

  const interactionData = [...defiInteractionData];
  for (let i = interactionData.length; i < numberOfDefiInteraction; ++i) {
    interactionData[i] = DefiInteractionData.EMPTY;
  }
  const bridgeIds = interactionData.map(d => d.bridgeId);
  const defiDepositSums = interactionData.map(d => d.totalInputValue);

  const interactionNoteCommitments = [...prevInteractionResult];
  for (let i = prevInteractionResult.length; i < numberOfDefiInteraction; ++i) {
    interactionNoteCommitments.push(Buffer.alloc(32));
  }

  const assetIds: Set<number> = new Set();
  innerProofs.forEach(proof => {
    switch (proof.proofId) {
      case ProofId.DEFI_DEPOSIT:
      case ProofId.DEFI_CLAIM: {
        const bridgeId = BridgeId.fromBuffer(proof.assetId);
        assetIds.add(bridgeId.inputAssetIdA);
        break;
      }
      case ProofId.ACCOUNT:
        break;
      default:
        assetIds.add(proof.assetId.readUInt32BE(28));
    }
  });

  const innerProofLen = rollupSize;
  const padding = Buffer.alloc(32 * InnerProofData.NUM_PUBLIC_INPUTS * (innerProofLen - innerProofs.length), 0);

  const proofData = Buffer.concat([
    numToBuffer(rollupId),
    numToBuffer(rollupSize),
    dataStartIndexBuf,
    dataRoots[rollupId],
    dataRoots[rollupId + 1],
    nullifierRoots[rollupId],
    nullifierRoots[rollupId + 1],
    dataRootRoots[rollupId],
    dataRootRoots[rollupId + 1],
    defiRoots[rollupId],
    defiRoots[rollupId + 1],
    ...bridgeIds.map(id => id.toBuffer()),
    ...defiDepositSums.map(sum => toBufferBE(sum, 32)),
    ...[...assetIds].map(assetId => numToBuffer(assetId)),
    ...Array(numberOfAssets - assetIds.size).fill(numToBuffer(2 ** 30)),
    ...totalTxFeePublicInputs,
    ...interactionNoteCommitments,
    previousDefiInteractionHash || WorldStateConstants.INITIAL_INTERACTION_HASH,
    feeDistributorAddress.toBuffer32(),
    numToBuffer(rollupSize), // ??
    ...innerProofs.map(p => p.toBuffer()),
    padding,
  ]);

  const rollupProofData = RollupProofData.fromBuffer(proofData);

  return {
    ...innerProofOutput,
    proofData,
    rollupProofData,
    offchainTxData,
  };
};
