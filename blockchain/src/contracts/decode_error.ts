import { EthereumProvider, RevertError, TxHash } from '@aztec/barretenberg/blockchain';
import { Contract, utils } from 'ethers';

export interface Fragment {
  name: string;
  type: string;
  fullHash: string;
  inputs: string[];
}

function extractFragmentsBySelector(contract: Contract, filter?: string) {
  const errorMappings: { [key: string]: Fragment } = {};
  const fragments = filter ? contract.interface.fragments.filter(f => f.type === filter) : contract.interface.fragments;
  for (const frag of fragments) {
    const sig = `${frag.name}(${frag.inputs.map(f => f.type).join(',')})`;
    const fullHash = utils.keccak256(utils.toUtf8Bytes(sig));
    const selector = fullHash.slice(2, 10);
    errorMappings[selector] = {
      name: frag.name,
      type: frag.type,
      fullHash,
      inputs: frag.inputs.map(f => f.type),
    };
  }
  return errorMappings;
}

export function decodeSelector(contract: Contract, selector: string) {
  const mappings = extractFragmentsBySelector(contract);
  return mappings[selector];
}

export function retrieveContractSelectors(contract: Contract, type?: string) {
  return extractFragmentsBySelector(contract, type);
}

export function decodeErrorFromContract(contract: Contract, data: string) {
  const errorMappings = extractFragmentsBySelector(contract, 'error');
  const fullData = data.slice(2);
  const sigHash = fullData.slice(0, 8);
  // the rest of the data is any arguments given to the revert
  const args = fullData.slice(8);

  // look to see if we have the signature hash
  if (!errorMappings[sigHash]) {
    return;
  }
  const errorMapping = errorMappings[sigHash];

  // now try and decode the params based on their input type
  let result = [];
  if (errorMapping && errorMapping.inputs.length) {
    const abiDecodeString = errorMapping.inputs;
    result = contract.interface._abiCoder.decode(abiDecodeString, `0x${args}`).map(x => x.toString());
  }

  const errorValue: RevertError = {
    name: errorMapping!.name,
    params: result,
  };

  return errorValue;
}

export async function decodeErrorFromContractByTxHash(contract: Contract, txHash: TxHash, provider: EthereumProvider) {
  const { to, from, gas, maxFeePerGas, maxPriorityFeePerGas, input, value, chainId, nonce, blockNumber } =
    await provider.request({
      method: 'eth_getTransactionByHash',
      params: [txHash.toString()],
    });
  const req = {
    to,
    from,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    data: input,
    value,
    chainId,
    nonce,
  };
  const rep = await provider.request({ method: 'eth_call', params: [req, blockNumber] }).catch(err => err);
  if (!rep.data) {
    return;
  }

  return decodeErrorFromContract(contract, rep.data);
}
