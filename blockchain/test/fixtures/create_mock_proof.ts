import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { ethSign } from '../signing/eth_sign';
import { numToUInt32BE } from 'barretenberg/serialize';
import { toBufferBE } from 'bigint-buffer';
import { InnerProofData } from 'barretenberg/rollup_proof';

const dataNoteSize = 64;

export const numToBuffer = (num: number) => numToUInt32BE(num, 32);
export const oldDataRoot = Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex');
export const newDataRoot = Buffer.from('a8f6bde50516dd1201088fd8dda84c97eda5652428d1c7e86af529cc5e0eb821', 'hex');
export const oldNullifierRoot = Buffer.from('2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1', 'hex');
export const newNullifierRoot = Buffer.from('a82175cffcb23dfbd80262802e32efe7db5fdcb91ba0a0527ab1ffb323bf3fc0', 'hex');
export const oldDataRootsRoot = Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex');
export const secondProofNewDataRoot = randomBytes(32);
export const secondProofNewNullifierRoot = randomBytes(32);
export const secondProofNewDataRootsRoot = randomBytes(32);

export const newDataRootsRoot = newDataRoot;

class InnerProofOutput {
  constructor(public innerProofs: Buffer[], public signatures: Buffer[], public totalTxFees: number[]) {}
}

// Note: creates publicInputData, so that the 'new' values for the deposit proof map onto the 'old'
// values for the subsequent withdraw proof
function publicInputData(
  id: number,
  innerProofOutput: InnerProofOutput,
  rollupSize: number,
  numberOfAssets: number,
  dataStartIndex?: number,
) {
  const { innerProofs, totalTxFees } = innerProofOutput;
  const rollupId = numToBuffer(id);
  const rollupSizeBuf = numToBuffer(rollupSize);
  const numTxsBuf = numToBuffer(innerProofs.length);
  const dataStartIndexBuf = numToBuffer(dataStartIndex === undefined ? id * rollupSize * 2 : dataStartIndex);

  const totalTxFeePublicInputs: Buffer[] = [];
  for (let i = 0; i < numberOfAssets; ++i) {
    totalTxFeePublicInputs.push(numToBuffer(totalTxFees[i] || 0));
  }

  let allPublicInputs: Buffer[];
  if (id === 0) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndexBuf,
      oldDataRoot,
      newDataRoot,
      oldNullifierRoot,
      newNullifierRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      ...totalTxFeePublicInputs,
      numTxsBuf,
    ];
  } else if (id === 1) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndexBuf,
      newDataRoot,
      secondProofNewDataRoot,
      newNullifierRoot,
      secondProofNewNullifierRoot,
      newDataRootsRoot,
      secondProofNewDataRootsRoot,
      ...totalTxFeePublicInputs,
      numTxsBuf,
    ];
  } else if (id === 2) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndexBuf,
      secondProofNewDataRoot,
      randomBytes(32),
      secondProofNewNullifierRoot,
      randomBytes(32),
      secondProofNewDataRootsRoot,
      randomBytes(32),
      ...totalTxFeePublicInputs,
      numTxsBuf,
    ];
  } else {
    allPublicInputs = [Buffer.alloc(32)];
  }
  return allPublicInputs;
}

/**
 * Create the inner proof data for a proof. The inner proof is signed by a users Ethereum secp256k1 private key,
 * to act as positioning for the token transfer. This signature is then appended to the innerProof and validated
 * in the contract
 *
 * @param isDeposit
 * @param transferAmount
 * @param publicOwner
 * @param ethPrivateKey
 */
async function innerProofData(
  isDeposit: boolean,
  transferAmount: number,
  publicOwner: EthAddress,
  assetId: Buffer,
  txFee: number,
) {
  const proofId = Buffer.alloc(32);
  let publicInput;
  let publicOutput;
  let inputOwner = Buffer.alloc(32);
  let outputOwner = Buffer.alloc(32);

  if (isDeposit) {
    publicInput = numToBuffer(transferAmount + txFee);
    publicOutput = numToBuffer(0);
    inputOwner = publicOwner.toBuffer32();
  } else {
    publicInput = numToBuffer(txFee);
    publicOutput = numToBuffer(transferAmount);
    outputOwner = publicOwner.toBuffer32();
  }
  const newNote1 = randomBytes(dataNoteSize);
  const newNote2 = randomBytes(dataNoteSize);
  const nullifier1 = Buffer.concat([Buffer.alloc(16), randomBytes(16)]);
  const nullifier2 = Buffer.concat([Buffer.alloc(16), randomBytes(16)]);

  return Buffer.concat([
    proofId,
    publicInput,
    publicOutput,
    assetId,
    newNote1,
    newNote2,
    nullifier1,
    nullifier2,
    inputOwner,
    outputOwner,
  ]);
}

export async function createDepositProof(
  amount: number,
  depositorAddress: EthAddress,
  user: Signer,
  assetId = 1,
  txFee = 0,
) {
  const innerProof = await innerProofData(true, amount, depositorAddress, numToBuffer(assetId), txFee);
  const { signature } = await ethSign(user, innerProof);

  const totalTxFees: number[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
}

export async function createTwoDepositsProof(
  firstDepositAmount: number,
  firstDepositorAddress: EthAddress,
  firstUser: Signer,
  firstAssetId: number,
  secondDepositAmount: number,
  secondDepositorAddress: EthAddress,
  secondUser: Signer,
  secondAssetId: number,
  txFee = 0,
) {
  const firstInnerProof = await innerProofData(
    true,
    firstDepositAmount,
    firstDepositorAddress,
    numToBuffer(firstAssetId),
    txFee,
  );
  const secondInnerProof = await innerProofData(
    true,
    secondDepositAmount,
    secondDepositorAddress,
    numToBuffer(secondAssetId),
    txFee,
  );
  const { signature: firstSignature } = await ethSign(firstUser, firstInnerProof);
  const { signature: secondSignature } = await ethSign(secondUser, secondInnerProof);
  const totalTxFees: number[] = [];
  totalTxFees[firstAssetId] = txFee;
  totalTxFees[secondAssetId] = txFee;

  return {
    innerProofs: [firstInnerProof, secondInnerProof],
    signatures: [firstSignature, secondSignature],
    totalTxFees,
  };
}

export async function createWithdrawProof(amount: number, withdrawalAddress: EthAddress, assetId = 1, txFee = 0) {
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId), txFee);

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);

  const totalTxFees: number[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
}

export async function createSendProof(assetId = 1, txFee = 0) {
  const transferAmount = 0;
  const publicOwner = EthAddress.ZERO;
  const innerProof = await innerProofData(true, transferAmount, publicOwner, numToBuffer(assetId), txFee);
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0];
  const totalTxFees: number[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
}

// same as withdraw proof, except rollupSize in publicInputData set to 0 - indicating
// that it's an escape proof
export async function createEscapeProof(amount: number, withdrawalAddress: EthAddress, assetId = 1, txFee = 0) {
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId), txFee);

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);

  const totalTxFees: number[] = [];
  totalTxFees[assetId] = txFee;

  return new InnerProofOutput([innerProof], [signature], totalTxFees);
}

interface RollupProofOptions {
  rollupId?: number;
  rollupSize?: number;
  numberOfAssets?: number;
  dataStartIndex?: number;
  feeLimit?: bigint;
  feeDistributorAddress?: EthAddress;
}

export async function createRollupProof(
  rollupProvider: Signer,
  innerProofOutput: InnerProofOutput,
  {
    rollupId = 0,
    rollupSize = 2,
    numberOfAssets = 4,
    dataStartIndex,
    feeLimit = BigInt(0),
    feeDistributorAddress = EthAddress.randomAddress(),
  }: RollupProofOptions = {},
) {
  const { innerProofs } = innerProofOutput;
  const publicInputs = publicInputData(rollupId, innerProofOutput, rollupSize, numberOfAssets, dataStartIndex);
  // Escape hatch is demarked 0, but has size 1.
  rollupSize = rollupSize || 1;
  const padding = Buffer.alloc(32 * InnerProofData.NUM_PUBLIC_INPUTS * (rollupSize - innerProofs.length), 0);
  const proofData = Buffer.concat([...publicInputs, ...innerProofs, padding]);

  const providerAddress = await rollupProvider.getAddress();
  const sigData = Buffer.concat([
    ...publicInputs,
    Buffer.from(providerAddress.slice(2), 'hex'),
    toBufferBE(feeLimit, 32),
    feeDistributorAddress.toBuffer(),
  ]);
  const providerSignature = (await ethSign(rollupProvider, sigData)).signature;

  return {
    ...innerProofOutput,
    proofData,
    providerSignature,
    publicInputs,
  };
}
