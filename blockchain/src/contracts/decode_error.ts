import { EthereumProvider, RevertError, TxHash } from '@aztec/barretenberg/blockchain';
import { Contract, utils } from 'ethers';

interface Fragment {
  name: string;
  inputs: string[];
}

function extractErrorFragmentsBySelector(contract: Contract) {
  const errorMappings = new Map<string, Fragment>();
  for (const frag of contract.interface.fragments.filter(frag => frag.type === 'error')) {
    const sig = `${frag.name}(${frag.inputs.map(f => f.type).join(',')})`;
    const selector = utils.keccak256(utils.toUtf8Bytes(sig)).slice(2, 10);
    errorMappings.set(selector, {
      name: frag.name,
      inputs: frag.inputs.map(f => f.type),
    });
  }
  return errorMappings;
}

export function decodeSelector(contract: Contract, selector: string) {
  const mappings = extractErrorFragmentsBySelector(contract);
  return mappings.get(selector);
}

export async function decodeErrorFromContract(contract: Contract, data: string) {
  const errorMappings = extractErrorFragmentsBySelector(contract);
  const fullData = data.slice(2);
  const sigHash = fullData.slice(0, 8);
  // the rest of the data is any arguments given to the revert
  const args = fullData.slice(8);

  // look to see if we have the signature hash
  if (!errorMappings.has(sigHash)) {
    return;
  }
  const errorMapping = errorMappings.get(sigHash);

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
  const { to, from, gas, maxFeePerGas, maxPriorityFeePerGas, input, value, chainId, nonce } = await provider.request({
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
  const rep = await provider.request({ method: 'eth_call', params: [req] }).catch(err => err);
  if (rep.name !== 'CallError') {
    return;
  }

  return decodeErrorFromContract(contract, rep.data);
}
