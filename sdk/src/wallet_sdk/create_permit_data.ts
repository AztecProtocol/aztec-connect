import { EthAddress } from 'barretenberg/address';
import { TypedData } from 'barretenberg/blockchain';

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
  const types = getTypes();
  const message = getMessage(owner, spender, value, nonce, deadline);
  return { domain, types, message };
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
