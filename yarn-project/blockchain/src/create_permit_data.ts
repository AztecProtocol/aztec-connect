import { EthAddress } from '@aztec/barretenberg/address';
import { TypedData } from '@aztec/barretenberg/blockchain';

const types = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
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

const noneStandardTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Permit: [
    {
      name: 'holder',
      type: 'address',
    },
    {
      name: 'spender',
      type: 'address',
    },
    {
      name: 'nonce',
      type: 'uint256',
    },
    {
      name: 'expiry',
      type: 'uint256',
    },
    {
      name: 'allowed',
      type: 'bool',
    },
  ],
};

export function createPermitData(
  name: string,
  owner: EthAddress,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  verifyingContract: EthAddress,
  chainId: number,
  version = '1',
): TypedData {
  const domain = {
    name,
    version,
    chainId: chainId.toString(),
    verifyingContract: verifyingContract.toString(),
  };
  const message = {
    owner: owner.toString(),
    spender: spender.toString(),
    value: value.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };
  return { types, domain, message, primaryType: 'Permit' };
}

export function createPermitDataNonStandard(
  name: string,
  owner: EthAddress,
  spender: EthAddress,
  nonce: bigint,
  deadline: bigint,
  verifyingContract: EthAddress,
  chainId: number,
  version = '1',
): TypedData {
  const domain = {
    name,
    version,
    chainId: chainId.toString(),
    verifyingContract: verifyingContract.toString(),
  };
  const message = {
    holder: owner.toString(),
    spender: spender.toString(),
    nonce: nonce.toString(),
    expiry: deadline.toString(),
    allowed: true,
  };
  return { types: noneStandardTypes, domain, message, primaryType: 'Permit' };
}
