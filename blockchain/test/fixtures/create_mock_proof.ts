import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { InnerProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { ethSign } from './eth_sign';

export const numToBuffer = (num: number) => numToUInt32BE(num, 32);

const randomNote = () => randomBytes(64);

const randomNullifier = () => Buffer.concat([Buffer.alloc(16), randomBytes(16)]);

export const dataRoots = [
  Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex'),
  Buffer.from('a8f6bde50516dd1201088fd8dda84c97eda5652428d1c7e86af529cc5e0eb821', 'hex'),
  randomBytes(32),
  randomBytes(32),
];

export const nullifierRoots = [
  Buffer.from('2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1', 'hex'),
  Buffer.from('a82175cffcb23dfbd80262802e32efe7db5fdcb91ba0a0527ab1ffb323bf3fc0', 'hex'),
  randomBytes(32),
  randomBytes(32),
];

export const dataRootRoots = [
  Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex'),
  randomBytes(32),
  randomBytes(32),
  randomBytes(32),
];

export const defiRoots = [
  Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex'),
  randomBytes(32),
  randomBytes(32),
  randomBytes(32),
];

export const interactionHashes = [
  Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
  Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
  Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
  Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
];

class InnerProofOutput {
  constructor(public innerProofs: InnerProofData[], public signatures: Buffer[], public totalTxFees: bigint[]) {}
}

export const createDepositProof = async (
  amount: bigint,
  depositorAddress: EthAddress,
  user: Signer,
  assetId = 1,
  txFee = 0n,
) => {
  const innerProof = new InnerProofData(
    ProofId.JOIN_SPLIT,
    toBufferBE(amount + txFee, 32),
    toBufferBE(0n, 32),
    numToBuffer(assetId),
    randomNote(),
    randomNote(),
    randomNullifier(),
    randomNullifier(),
    depositorAddress.toBuffer32(),
    Buffer.alloc(32),
  );
  const { signature } = await ethSign(user, innerProof.toBuffer());

  const totalTxFees: bigint[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
};

export const createWithdrawProof = (amount: bigint, withdrawalAddress: EthAddress, assetId = 1, txFee = 0n) => {
  const innerProof = new InnerProofData(
    ProofId.JOIN_SPLIT,
    toBufferBE(0n, 32),
    toBufferBE(amount + txFee, 32),
    numToBuffer(assetId),
    randomNote(),
    randomNote(),
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
    randomNote(),
    randomNote(),
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
    randomNote(),
    randomNote(),
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
) =>
  Buffer.concat([
    proofData.slice(0, 23 * 32),
    providerAddress.toBuffer(),
    toBufferBE(feeLimit, 32),
    feeDistributorAddress.toBuffer(),
  ]);

export const createRollupProof = async (
  rollupProvider: Signer,
  innerProofOutput: InnerProofOutput,
  {
    rollupId = 0,
    rollupSize = 2,
    dataStartIndex,
    numberOfAssets = 4,
    numberOfDefiInteraction = 4,
    previousDefiInteractionHash,
    defiInteractionData = [],
    prevInteractionResult = [],
    feeLimit = BigInt(0),
    feeDistributorAddress = EthAddress.randomAddress(),
  }: RollupProofOptions = {},
) => {
  const { innerProofs, totalTxFees } = innerProofOutput;

  const dataStartIndexBuf = numToBuffer(dataStartIndex === undefined ? rollupId * rollupSize * 2 : dataStartIndex);

  const totalTxFeePublicInputs: Buffer[] = [];
  for (let i = 0; i < numberOfAssets; ++i) {
    totalTxFeePublicInputs.push(toBufferBE(totalTxFees[i] || 0n, 32));
  }

  const interactionData = [...defiInteractionData];
  for (let i = interactionData.length; i < numberOfDefiInteraction; ++i) {
    interactionData[i] = DefiInteractionData.EMPTY;
  }
  const bridgeIds = interactionData.map(d => d.bridgeId);
  const defiDepositSums = interactionData.map(d => d.totalInputValue);

  const encryptedInteractionNotes = [...prevInteractionResult];
  for (let i = prevInteractionResult.length; i < numberOfDefiInteraction; ++i) {
    encryptedInteractionNotes.push(Buffer.alloc(64));
  }

  // Escape hatch is demarked 0, but has size 1.
  const innerProofLen = rollupSize || 1;
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
    ...totalTxFeePublicInputs,
    ...innerProofs.map(p => p.toBuffer()),
    padding,
    recursiveProofOutput,
    ...encryptedInteractionNotes,
    previousDefiInteractionHash || interactionHashes[rollupId],
  ]);

  const providerAddress = EthAddress.fromString(await rollupProvider.getAddress());
  const sigData = createSigData(proofData, providerAddress, feeLimit, feeDistributorAddress);
  const providerSignature = (await ethSign(rollupProvider, sigData)).signature;

  return {
    ...innerProofOutput,
    proofData,
    providerSignature,
    sigData,
  };
};

// Same as rollup proof, except rollupSize is set to 0.
export const createEscapeHatchProof = async (
  signer: Signer,
  innerProofOutput: InnerProofOutput,
  options: RollupProofOptions = {},
) => {
  const { innerProofs } = innerProofOutput;
  if (innerProofs.length !== 1) {
    throw new Error('Escape hatch proof only has 1 inner proof.');
  }

  return createRollupProof(signer, innerProofOutput, {
    ...options,
    rollupSize: 0,
  });
};
