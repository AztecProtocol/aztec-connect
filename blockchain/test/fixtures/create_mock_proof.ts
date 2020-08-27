import { randomBytes } from 'crypto';
import { constants, Signer, utils } from 'ethers';
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

export const newDataRootsRoot = newDataRoot;

// Note: creates publicInputData, so that the 'new' values for the deposit proof map onto the 'old'
// values for the subsequent withdraw proof
function publicInputData(id: number, isFirstProof: boolean, numInner: number, rollupSize = 2) {
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
  if (isFirstProof) {
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
  } else {
    allPublicInputs = [
      rollupId,
      rollupSizeBuf,
      dataStartIndex(0x04),
      newDataRoot,
      randomBytes(32),
      newNullifierRoot,
      randomBytes(32),
      newDataRootsRoot,
      randomBytes(32),
      numTxs,
    ];
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
 * @param publicOwnerUnformatted
 * @param ethPrivateKey
 */
async function innerProofData(isDeposit: boolean, transferAmount: number, publicOwnerUnformatted: string) {
  const proofId = Buffer.alloc(32);
  let publicInput;
  let publicOutput;
  let inputOwner = Buffer.alloc(32);
  let outputOwner = Buffer.alloc(32);

  if (isDeposit) {
    publicInput = numToBuffer(transferAmount);
    publicOutput = numToBuffer(0);
    inputOwner = Buffer.concat([Buffer.alloc(12), Buffer.from(publicOwnerUnformatted.slice(2), 'hex')]);
  } else {
    publicInput = numToBuffer(0);
    publicOutput = numToBuffer(transferAmount);
    outputOwner = Buffer.concat([Buffer.alloc(12), Buffer.from(publicOwnerUnformatted.slice(2), 'hex')]);
  }
  const newNote1 = randomBytes(dataNoteSize);
  const newNote2 = randomBytes(dataNoteSize);
  const nullifier1 = Buffer.concat([Buffer.alloc(16), randomBytes(16)]);
  const nullifier2 = Buffer.concat([Buffer.alloc(16), randomBytes(16)]);

  return Buffer.concat([
    proofId,
    publicInput,
    publicOutput,
    newNote1,
    newNote2,
    nullifier1,
    nullifier2,
    inputOwner,
    outputOwner,
  ]);
}

export async function createDepositProof(amount: number, depositorAddress: string, user: Signer) {
  const id: number = 0x00;
  const numInner: number = 0x01;

  const innerProof = await innerProofData(true, amount, depositorAddress);
  const { signature } = await ethSign(user, innerProof);
  const sigIndexes = [0]; // first index corresponds to first innerProof

  return {
    proofData: Buffer.concat([...publicInputData(id, true, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}

export async function createTwoDepositsProof(
  firstDepositAmount: number,
  firstDepositorAddress: string,
  firstUser: Signer,
  secondDepositAmount: number,
  secondDepositorAddress: string,
  secondUser: Signer,
) {
  const id: number = 0x00;
  const numInner: number = 0x02;
  const firstInnerProof = await innerProofData(true, firstDepositAmount, firstDepositorAddress);
  const secondInnerProof = await innerProofData(true, secondDepositAmount, secondDepositorAddress);

  const { signature: firstSignature } = await ethSign(firstUser, firstInnerProof);
  const { signature: secondSignature } = await ethSign(secondUser, secondInnerProof);

  return {
    proofData: Buffer.concat([...publicInputData(id, true, numInner), firstInnerProof, secondInnerProof]),
    signatures: [secondSignature, firstSignature],
    sigIndexes: [1, 0], // deliberately reverse sig order to more thoroughly test
  };
}

export async function createWithdrawProof(amount: number, withdrawalAddress: string) {
  const id: number = 0x01;
  const numInner: number = 0x01;
  const innerProof = await innerProofData(false, amount, withdrawalAddress);

  // withdraws do not require signature
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0]; // first index corresponds to first tx

  return {
    proofData: Buffer.concat([...publicInputData(id, false, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}

export async function createSendProof() {
  const id: number = 0x00;
  const numInner: number = 0x01;
  const transferAmount: number = 0;
  const publicOwner: string = constants.AddressZero;
  const innerProof = await innerProofData(true, transferAmount, publicOwner);
  const signature: Buffer = Buffer.alloc(32);
  const sigIndexes = [0];
  return {
    proofData: Buffer.concat([...publicInputData(id, true, numInner), innerProof]),
    signatures: [signature],
    sigIndexes,
  };
}
