import { EthAddress } from '@aztec/barretenberg/address';
import { TypedData } from '@aztec/barretenberg/blockchain';

const types = {
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
    chainId,
    verifyingContract: verifyingContract.toString(),
  };
  const message = {
    owner: owner.toString(),
    spender: spender.toString(),
    value,
    nonce,
    deadline,
  };
  return { types, domain, message };
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
    chainId,
    verifyingContract: verifyingContract.toString(),
  };
  const message = {
    holder: owner,
    spender,
    nonce,
    expiry: deadline,
    allowed: true,
  };
  return { types: noneStandardTypes, domain, message };
}
