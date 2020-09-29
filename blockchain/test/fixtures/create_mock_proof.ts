import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Signer, utils } from 'ethers';
import { ethSign } from '../signing/eth_sign';

const dataNoteSize = 64;

export function numToBuffer(input: number) {
  return Buffer.from(utils.hexZeroPad(`0x${input.toString(16)}`, 32).slice(2), 'hex');
}

// prettier-ignore
function dataStartIndex(dataStart: number) {
    return Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, dataStart,
    ])
}

// prettier-ignore
export const oldDataRoot = Buffer.from([
    0x1d, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
    0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
]);

// prettier-ignore
export const newDataRoot = Buffer.from([
    0xa8, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
    0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
]);

// prettier-ignore
export const oldNullifierRoot = Buffer.from([
    0x15, 0x21, 0x75, 0xcf, 0xfc, 0xb2, 0x3d, 0xfb, 0xd8, 0x02, 0x62, 0x80, 0x2e, 0x32, 0xef, 0xe7,
    0xdb, 0x5f, 0xdc, 0xb9, 0x1b, 0xa0, 0xa0, 0x52, 0x7a, 0xb1, 0xff, 0xb3, 0x23, 0xbf, 0x3f, 0xc0,
]);

// prettier-ignore
export const newNullifierRoot = Buffer.from([
    0xa8, 0x21, 0x75, 0xcf, 0xfc, 0xb2, 0x3d, 0xfb, 0xd8, 0x02, 0x62, 0x80, 0x2e, 0x32, 0xef, 0xe7,
    0xdb, 0x5f, 0xdc, 0xb9, 0x1b, 0xa0, 0xa0, 0x52, 0x7a, 0xb1, 0xff, 0xb3, 0x23, 0xbf, 0x3f, 0xc0,
]);

// prettier-ignore
export const oldDataRootsRoot = Buffer.from([
    0x1b, 0x22, 0xef, 0x60, 0x7a, 0xe0, 0x85, 0x88, 0xbc, 0x83, 0xa7, 0x9f, 0xfa, 0xce, 0xc5, 0x07,
    0x34, 0x7b, 0xd2, 0xde, 0xe4, 0x4c, 0x84, 0x61, 0x81, 0xb7, 0x05, 0x12, 0x85, 0xc3, 0x2c, 0x0a,
]);

export const secondProofNewDataRoot = randomBytes(32);
export const secondProofNewNullifierRoot = randomBytes(32);
export const secondProofNewDataRootsRoot = randomBytes(32);

export const newDataRootsRoot = newDataRoot;

// Note: creates publicInputData, so that the 'new' values for the deposit proof map onto the 'old'
// values for the subsequent withdraw proof
function publicInputData(id: number, proofNum: number, numInner: number, rollupSize = 2) {
  // prettier-ignore
  const rollupId = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, id,
  ]);

  // prettier-ignore
  const rollupSizeBuf = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, rollupSize,
  ]);

  // prettier-ignore
  const numTxs = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, numInner,
]);

  let allPublicInputs;
  if (proofNum === 1) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndex(0x00),
      oldDataRoot,
      newDataRoot,
      oldNullifierRoot,
      newNullifierRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      numTxs,
    ];
  } else if (proofNum === 2) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndex(0x04),
      newDataRoot,
      secondProofNewDataRoot,
      newNullifierRoot,
      secondProofNewNullifierRoot,
      newDataRootsRoot,
      secondProofNewDataRootsRoot,
      numTxs,
    ];
  } else if (proofNum === 3) {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndex(0x06),
      secondProofNewDataRoot,
      randomBytes(32),
      secondProofNewNullifierRoot,
      randomBytes(32),
      secondProofNewDataRootsRoot,
      randomBytes(32),
      numTxs,
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
async function innerProofData(isDeposit: boolean, transferAmount: number, publicOwner: EthAddress, assetId: Buffer) {
  const proofId = Buffer.alloc(32);
  let publicInput;
  let publicOutput;
  let inputOwner = Buffer.alloc(32);
  let outputOwner = Buffer.alloc(32);

  if (isDeposit) {
    publicInput = numToBuffer(transferAmount);
    publicOutput = numToBuffer(0);
    inputOwner = publicOwner.toBuffer32();
  } else {
    publicInput = numToBuffer(0);
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
  assetId: number = 0,
) {
  const id: number = 0x00;
  const numInner: number = 0x01;

  const innerProof = await innerProofData(true, amount, depositorAddress, numToBuffer(assetId));
  const { signature } = await ethSign(user, innerProof);
  const sigIndexes = [0]; // first index corresponds to first innerProof

  return {
    proofData: Buffer.concat([...publicInputData(id, 1, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
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
) {
  const id: number = 0x00;
  const numInner: number = 0x02;
  const firstInnerProof = await innerProofData(true, firstDepositAmount, firstDepositorAddress, firstAssetId);
  const secondInnerProof = await innerProofData(true, secondDepositAmount, secondDepositorAddress, secondAssetId);

  const { signature: firstSignature } = await ethSign(firstUser, firstInnerProof);
  const { signature: secondSignature } = await ethSign(secondUser, secondInnerProof);

  return {
    proofData: Buffer.concat([...publicInputData(id, 1, numInner), firstInnerProof, secondInnerProof]),
    signatures: [secondSignature, firstSignature],
    sigIndexes: [1, 0], // deliberately reverse sig order to more thoroughly test
  };
}

export async function createWithdrawProof(amount: number, withdrawalAddress: EthAddress, assetId: number = 0) {
  const id: number = 0x01;
  const numInner: number = 0x01;
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId));

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0]; // first index corresponds to first tx

  return {
    proofData: Buffer.concat([...publicInputData(id, 2, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}

export async function createSendProof(assetId: number = 0) {
  const id: number = 0x00;
  const numInner: number = 0x01;
  const transferAmount: number = 0;
  const publicOwner = EthAddress.ZERO;
  const innerProof = await innerProofData(true, transferAmount, publicOwner, numToBuffer(assetId));
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0];
  return {
    proofData: Buffer.concat([...publicInputData(id, 1, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}

// same as withdraw proof, except rollupSize in publicInputData set to 0 - indicating
// that it's an escape proof
export async function createEscapeProof(amount: number, withdrawalAddress: EthAddress, assetId: number = 0) {
  const id: number = 0x01;
  const numInner: number = 0x01;
  const innerProof = await innerProofData(false, amount, withdrawalAddress, numToBuffer(assetId));

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0]; // first index corresponds to first tx
  return {
    proofData: Buffer.concat([...publicInputData(id, 2, numInner, 0), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}
