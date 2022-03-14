import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthersAdapter } from '../../../provider';

const gasLimit = 5000000;

export async function setupFeeDistributor(
  publisher: Signer,
  rollupProcessorAddress: EthAddress,
  uniswapRouterAddress: EthAddress,
) {
  const feeOwner = await publisher.getAddress();
  const AztecFeeDistributor = await ethers.getContractFactory('AztecFeeDistributor', publisher);

  const feeDistributorContract = await AztecFeeDistributor.deploy(
    feeOwner.toString(),
    rollupProcessorAddress.toString(),
    uniswapRouterAddress.toString(),
  );

  const feeDistributor = new FeeDistributor(
    EthAddress.fromString(feeDistributorContract.address),
    new EthersAdapter(ethers.provider),
    { gasLimit },
  );

  return {
    feeDistributor,
  };
}
