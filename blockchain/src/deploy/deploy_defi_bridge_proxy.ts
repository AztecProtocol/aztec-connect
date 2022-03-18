import { ContractFactory, Signer } from 'ethers';
import DefiBridgeProxy from '../artifacts/contracts/DefiBridgeProxy.sol/DefiBridgeProxy.json';

export async function deployDefiBridgeProxy(signer: Signer) {
  console.error('Deploying DefiBridgeProxy...');
  const defiBridgeProxyLibrary = new ContractFactory(DefiBridgeProxy.abi, DefiBridgeProxy.bytecode, signer);
  const defiBridgeProxy = await defiBridgeProxyLibrary.deploy();
  console.error(`DefiBridgeProxy contract address: ${defiBridgeProxy.address}.`);
  return defiBridgeProxy;
}
