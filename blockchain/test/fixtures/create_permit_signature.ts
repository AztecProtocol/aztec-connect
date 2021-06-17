import { EthAddress } from '@aztec/barretenberg/address';
import { TypedData } from '@aztec/barretenberg/blockchain';
import { ecsign } from 'ethereumjs-util';
import { utils, Wallet } from 'ethers';

const { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } = utils;

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
);

function getPermitDigest(
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

export const createLowLevelPermitSig = async (
  privateKey: Buffer,
  userAddress: EthAddress,
  name: string,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  chainId: number,
  verifyingContract: EthAddress,
) => {
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
};

export const signPermit = async (signer: Wallet, { domain, types, message }: TypedData) => {
  const signature = (await signer._signTypedData(domain, types, message)).slice(2);
  const r = Buffer.from(signature.slice(0, 64), 'hex');
  const s = Buffer.from(signature.slice(64, 128), 'hex');
  const v = Buffer.from(signature.slice(128, 130), 'hex');
  return { v, r, s };
};
