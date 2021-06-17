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

const getDomain = (name: string, chainId: number, verifyingContract: string) => ({
  name,
  version: '1',
  chainId,
  verifyingContract,
});

const getMessage = (owner: EthAddress, spender: EthAddress, value: bigint, nonce: bigint, deadline: bigint) => ({
  owner: owner.toString(),
  spender: spender.toString(),
  value,
  nonce,
  deadline,
});

export function createPermitData(
  name: string,
  owner: EthAddress,
  spender: EthAddress,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  chainId: number,
  verifyingContract: EthAddress,
): TypedData {
  const domain = getDomain(name, chainId, verifyingContract.toString());
  const message = getMessage(owner, spender, value, nonce, deadline);
  return { types, domain, message };
}
