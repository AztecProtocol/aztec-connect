import { EthAddress } from '@aztec/barretenberg/address';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { AssetId } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { Web3Signer } from '../../../signer';
import { EthersAdapter } from '../../../provider';
import { Keccak } from 'sha3';

const numToBuffer = (num: number) => numToUInt32BE(num, 32);

const randomLeafHash = () => randomBytes(32);

const randomNullifier = () => Buffer.concat([Buffer.alloc(16), randomBytes(16)]);

const dataRoots = [WorldStateConstants.EMPTY_DATA_ROOT, randomBytes(32), randomBytes(32), randomBytes(32)];
const nullifierRoots = [WorldStateConstants.EMPTY_NULL_ROOT, randomBytes(32), randomBytes(32), randomBytes(32)];
const dataRootRoots = [WorldStateConstants.EMPTY_ROOT_ROOT, randomBytes(32), randomBytes(32), randomBytes(32)];
const defiRoots = [WorldStateConstants.EMPTY_DEFI_ROOT, randomBytes(32), randomBytes(32), randomBytes(32)];

const interactionHashes = [
  WorldStateConstants.INITIAL_INTERACTION_HASH,
  WorldStateConstants.INITIAL_INTERACTION_HASH,
  WorldStateConstants.INITIAL_INTERACTION_HASH,
  WorldStateConstants.INITIAL_INTERACTION_HASH,
];

class InnerProofOutput {
  constructor(public innerProofs: InnerProofData[], public signatures: Buffer[], public totalTxFees: bigint[]) {}
}

export const createDepositProof = async (
  amount: bigint,
  depositorAddress: EthAddress,
  user: Signer,
  assetId: AssetId,
  txFee = 0n,
) => {
  const innerProof = new InnerProofData(
    ProofId.JOIN_SPLIT,
    toBufferBE(amount + txFee, 32),
    toBufferBE(0n, 32),
    numToBuffer(assetId),
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    depositorAddress.toBuffer32(),
    Buffer.alloc(32),
  );
  const userAddr = EthAddress.fromString(await user.getAddress());
  const signature = await new Web3Signer(new EthersAdapter(user)).signMessage(innerProof.txId, userAddr);

  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
};

export const createWithdrawProof = (amount: bigint, withdrawalAddress: EthAddress, assetId: number, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.JOIN_SPLIT,
    toBufferBE(0n, 32),
    toBufferBE(amount + txFee, 32),
    numToBuffer(assetId),
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    withdrawalAddress.toBuffer32(),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [], totalTxFees);
};

export const createSendProof = (assetId = 1, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.JOIN_SPLIT,
    toBufferBE(0n, 32),
    toBufferBE(0n, 32),
    numToBuffer(assetId),
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [], totalTxFees);
};

export const createDefiProof = (bridgeId: BridgeId, inputValue: bigint, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.DEFI_DEPOSIT,
    toBufferBE(0n, 32),
    toBufferBE(inputValue, 32),
    bridgeId.toBuffer(),
    randomLeafHash(),
    randomLeafHash(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );
  const totalTxFees: bigint[] = [];
  totalTxFees[bridgeId.inputAssetId] = txFee;

  return new InnerProofOutput([innerProof], [], totalTxFees);
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
    numberOfAssets = 16,
    numberOfDefiInteraction = 4,
    previousDefiInteractionHash,
    defiInteractionData = [],
    prevInteractionResult = [],
    feeLimit = 10n ** 18n,
    feeDistributorAddress = EthAddress.randomAddress(),
  }: RollupProofOptions = {},
) => {
  const { innerProofs, totalTxFees } = innerProofOutput;

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
        assetIds.add(bridgeId.inputAssetId);
        break;
      }
      case ProofId.JOIN_SPLIT:
        assetIds.add(proof.assetId.readUInt32BE(28));
        break;
    }
  });

  const innerProofLen = rollupSize;
  const padding = Buffer.alloc(32 * InnerProofData.NUM_PUBLIC_INPUTS * (innerProofLen - innerProofs.length), 0);

  const recursiveProofOutput = Buffer.alloc(16 * 32);

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
    ...innerProofs.map(p => p.toBuffer()),
    padding,
    recursiveProofOutput,
    ...interactionNoteCommitments,
    previousDefiInteractionHash || interactionHashes[rollupId],
  ]);

  const providerAddress = EthAddress.fromString(await rollupProvider.getAddress());
  const sigData = createSigData(proofData, providerAddress, feeLimit, feeDistributorAddress);

  const providerSignature = await new Web3Signer(new EthersAdapter(rollupProvider)).signMessage(
    sigData,
    providerAddress,
  );

  const rollupProofData = RollupProofData.fromBuffer(proofData);

  return {
    ...innerProofOutput,
    proofData,
    providerSignature,
    sigData,
    rollupProofData,
    viewingKeys: [ViewingKey.random(), ViewingKey.random()],
  };
};
