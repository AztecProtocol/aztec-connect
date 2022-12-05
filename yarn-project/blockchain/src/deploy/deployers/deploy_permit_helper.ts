import { ContractFactory, Signer } from 'ethers';
import { PermitHelper } from '../../abis.js';
import { EthAddress } from '@aztec/barretenberg/address';

export async function deployPermitHelper(signer: Signer, rollupAddress: EthAddress) {
  console.log('Deploying permit helper...');
  const permitHelperFactory = new ContractFactory(PermitHelper.abi, PermitHelper.bytecode, signer);
  const permitHelper = await permitHelperFactory.deploy(rollupAddress.toString());
  console.log(`PermitHelper contract address: ${permitHelper.address}.`);

  return permitHelper;
}
