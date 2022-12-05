import { ContractFactory, Signer } from 'ethers';
import { DefiBridgeProxy } from '../../abis.js';

export async function deployDefiBridgeProxy(signer: Signer) {
  console.log('Deploying DefiBridgeProxy...');
  const defiBridgeProxyLibrary = new ContractFactory(DefiBridgeProxy.abi, DefiBridgeProxy.bytecode, signer);
  const defiBridgeProxy = await defiBridgeProxyLibrary.deploy();
  console.log(`DefiBridgeProxy contract address: ${defiBridgeProxy.address}.`);
  return defiBridgeProxy;
}
