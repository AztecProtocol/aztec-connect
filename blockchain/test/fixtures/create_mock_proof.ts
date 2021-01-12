import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { ethSign } from '../signing/eth_sign';
import { numToUInt32BE } from 'barretenberg/serialize';
import { toBufferBE } from 'bigint-buffer';

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

interface InnerProofOutput {
  innerProofs: Buffer[];
  signatures: Buffer[];
  sigIndexes: number[];
  totalTxFee: number;
}

// Note: creates publicInputData, so that the 'new' values for the deposit proof map onto the 'old'
// values for the subsequent withdraw proof
function publicInputData(id: number, numTxs: number, totalTxFee: number, rollupSize: number, dataStartIndex?: number) {
  const rollupId = numToBuffer(id);
  const rollupSizeBuf = numToBuffer(rollupSize);
  const numTxsBuf = numToBuffer(numTxs);
  const dataStartIndexBuf = numToBuffer(dataStartIndex === undefined ? id * rollupSize * 2 : dataStartIndex);

  let allPublicInputs;
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
      numToBuffer(totalTxFee),
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
      numToBuffer(totalTxFee),
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
      numToBuffer(totalTxFee),
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
  const sigIndexes = [0]; // first index corresponds to first innerProof

  return {
    innerProofs: [innerProof],
    signatures: [signature],
    sigIndexes,
    totalTxFee: txFee,
  };
}

export async function createTwoDepositsProof(
  firstDepositAmount: number,
  firstDepositorAddress: EthAddress,
  firstUser: Signer,
  firstAssetId: Buffer,
  secondDepositAmount: number,
  secondDepositorAddress: EthAddress,
  secondUser: Signer,
  secondAssetId: Buffer,
  txFee = 0,
) {
  const firstInnerProof = await innerProofData(true, firstDepositAmount, firstDepositorAddress, firstAssetId, txFee);
  const secondInnerProof = await innerProofData(
    true,
    secondDepositAmount,
    secondDepositorAddress,
    secondAssetId,
    txFee,
  );
  const { signature: firstSignature } = await ethSign(firstUser, firstInnerProof);
  const { signature: secondSignature } = await ethSign(secondUser, secondInnerProof);

  return {
    innerProofs: [firstInnerProof, secondInnerProof],
    signatures: [secondSignature, firstSignature],
    sigIndexes: [1, 0], // deliberately reverse sig order to more thoroughly test
    totalTxFee: txFee * 2,
  };
}

export async function createWithdrawProof(amount: number, withdrawalAddress: EthAddress, assetId = 1, txFee = 0) {
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId), txFee);

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0]; // first index corresponds to first tx

  return {
    innerProofs: [innerProof],
    signatures: [signature],
    sigIndexes,
    totalTxFee: txFee,
  };
}

export async function createSendProof(assetId = 1, txFee = 0) {
  const transferAmount = 0;
  const publicOwner = EthAddress.ZERO;
  const innerProof = await innerProofData(true, transferAmount, publicOwner, numToBuffer(assetId), txFee);
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0];

  return {
    innerProofs: [innerProof],
    signatures: [signature],
    sigIndexes,
    totalTxFee: txFee,
  };
}

// same as withdraw proof, except rollupSize in publicInputData set to 0 - indicating
// that it's an escape proof
export async function createEscapeProof(amount: number, withdrawalAddress: EthAddress, assetId = 1, txFee = 0) {
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId), txFee);

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0]; // first index corresponds to first tx

  return {
    innerProofs: [innerProof],
    signatures: [signature],
    sigIndexes,
    totalTxFee: txFee,
  };
}

interface RollupProofOptions {
  rollupId?: number;
  rollupSize?: number;
  dataStartIndex?: number;
  feeLimit?: bigint;
  feeDistributorAddress?: EthAddress;
}

export async function createRollupProof(
  rollupProvider: Signer,
  proofOutput: InnerProofOutput,
  {
    rollupId = 0,
    rollupSize = 2,
    dataStartIndex,
    feeLimit = BigInt(0),
    feeDistributorAddress = EthAddress.randomAddress(),
  }: RollupProofOptions = {},
) {
  const { innerProofs, totalTxFee } = proofOutput;
  const publicInputs = publicInputData(rollupId, innerProofs.length, totalTxFee, rollupSize, dataStartIndex);
  const proofData = Buffer.concat([...publicInputs, ...innerProofs]);

  const providerAddress = await rollupProvider.getAddress();
  const sigData = Buffer.concat([
    ...publicInputs,
    Buffer.from(providerAddress.slice(2), 'hex'),
    toBufferBE(feeLimit, 32),
    feeDistributorAddress.toBuffer(),
  ]);
  const providerSignature = (await ethSign(rollupProvider, sigData)).signature;

  return {
    ...proofOutput,
    proofData,
    providerSignature,
    publicInputs,
  };
}
