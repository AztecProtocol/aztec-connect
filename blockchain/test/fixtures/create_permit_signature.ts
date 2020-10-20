import { Wallet } from 'ethers';
import { utils } from 'ethers';
import { EthAddress } from 'barretenberg/address';
import { ecsign } from 'ethereumjs-util';

const { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } = utils;

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
);

export async function createLowLevelPermitSig(
  privateKey: Buffer,
  userAddress: EthAddress,
  name: string,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  chainId: number,
  verifyingContract: EthAddress,
) {
  const digest = await getPermitDigest(
    name,
    userAddress,
    spender,
    BigInt(value),
    nonce,
    deadline,
    chainId,
    verifyingContract,
  );
  const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey);
  return { v: Buffer.from(v.toString(16), 'hex'), r, s };
}

export function getPermitDigest(
  name: string,
  owner: EthAddress,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  chainId: number,
  verifyingContract: EthAddress,
) {
  const DOMAIN_SEPARATOR = getDomainSeparator(name, verifyingContract.toString(), chainId);
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, owner.toString(), spender.toString(), value, nonce, deadline],
          ),
        ),
      ],
    ),
  );
}

function getDomainSeparator(name: string, verifyingContract: string, chainId: number) {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        chainId,
        verifyingContract,
      ],
    ),
  );
}

export async function signPermit(
  signer: Wallet,
  name: string,
  owner: EthAddress,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  chainId: number,
  verifyingContract: EthAddress,
) {
  const domain = getDomain(name, chainId, verifyingContract.toString());
  const types = getTypes();
  const message = getMessage(owner, spender, value, nonce, deadline);

  const signature = (await signer._signTypedData(domain, types, message)).slice(2);
  const r = Buffer.from(signature.slice(0, 64), 'hex');
  const s = Buffer.from(signature.slice(64, 128), 'hex');
  const v = Buffer.from(signature.slice(128, 130), 'hex');
  return { v, r, s };
}

function getDomain(name: string, chainId: number, verifyingContract: string) {
  return { name, version: '1', chainId, verifyingContract };
}

function getTypes() {
  return {
    Permit: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  };
}

function getMessage(owner: EthAddress, spender: EthAddress, value: bigint, nonce: bigint, deadline: bigint) {
  return {
    owner: owner.toString(),
    spender: spender.toString(),
    value,
    nonce,
    deadline,
  };
}
