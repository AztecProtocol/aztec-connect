import { Contract, utils } from 'ethers';
import { EthereumProvider, RevertError, TxHash } from '@aztec/barretenberg/blockchain';

async function extractTransaction(txHash: TxHash, provider: EthereumProvider) {
  try {
    return await provider.request({ method: 'debug_traceTransaction', params: [txHash.toString()] });
  } catch (err) {
    return;
  }
}
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

export async function decodeErrorFromContract(contract: Contract, txHash: TxHash, provider: EthereumProvider) {
  const output = await extractTransaction(txHash, provider);
  if (!output) {
    return;
  }
  const errorMappings = extractErrorFragmentsBySelector(contract);
  // look for the REVERT opcode if there is one
  const revert = output.structLogs.find((log: any) => log.op === 'REVERT');
  if (!revert) {
    return;
  }
  // according to this page https://www.ethervm.io/#FD,
  // the entry at the top of the stack has the revert data offset in memory
  // and the entry 1 level beneath that has the length
  // both are in hex so extract them
  const offset = revert.stack[revert.stack.length - 1];
  const offsetBuf = Buffer.from(offset!, 'hex');
  const offsetInt = offsetBuf.readInt32BE(28) * 2;

  const length = revert.stack[revert.stack.length - 2];
  const lengthBuf = Buffer.from(length!, 'hex');
  const lengthInt = lengthBuf.readInt32BE(28) * 2;

  // now we can reference the mmemory area
  // the first 4 bytes (8 hex nibbles) are the first 4 bytes of the revert error hash,
  // which we can lookup in the mapping we created above
  const fullData = revert.memory.join('').slice(offsetInt, offsetInt + lengthInt);
  const sigHash = fullData.slice(0, 8);
  // the rest of the data is any arguments given to the revert
  const args = fullData.slice(8, lengthInt);

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
