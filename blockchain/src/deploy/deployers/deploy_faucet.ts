import { EthAddress } from '@aztec/barretenberg/address';
import { ContractFactory, Signer } from 'ethers';
import AztecFaucet from '../../artifacts/contracts/periphery/AztecFaucet.sol/AztecFaucet.json';

export async function deployAztecFaucet(signer: Signer, faucetOperator?: EthAddress) {
  console.error('Deploying AztecFaucet...');
  const faucetLibrary = new ContractFactory(AztecFaucet.abi, AztecFaucet.bytecode, signer);
  const faucet = await faucetLibrary.deploy();
  console.error(`AztecFaucet contract address: ${faucet.address}.`);

  if (faucetOperator) {
    console.error(`Enabling faucet operator with address ${faucetOperator}`);
    await faucet.updateApprovedOperator(faucetOperator.toString(), true);
  }

  return faucet;
}
