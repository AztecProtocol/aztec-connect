import { ContractFactory, Signer } from 'ethers';
import AztecFaucet from '../../artifacts/contracts/periphery/AztecFaucet.sol/AztecFaucet.json';

export async function deployAztecFaucet(signer: Signer) {
  console.error('Deploying AztecFaucet...');
  const faucetLibrary = new ContractFactory(AztecFaucet.abi, AztecFaucet.bytecode, signer);
  const faucet = await faucetLibrary.deploy();
  console.error(`AztecFaucet contract address: ${faucet.address}.`);

  return faucet;
}
