import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthersAdapter } from '../../../provider';

export async function setupFeeDistributor(
  publisher: Signer,
  rollupProcessorAddress: EthAddress,
  uniswapRouterAddress: EthAddress,
) {
  const AztecFeeDistributor = await ethers.getContractFactory('AztecFeeDistributor', publisher);
  const feeDistributorContract = await AztecFeeDistributor.deploy(
    rollupProcessorAddress.toString(),
    uniswapRouterAddress.toString(),
  );

  const feeDistributor = new FeeDistributor(
    EthAddress.fromString(feeDistributorContract.address),
    new EthersAdapter(ethers.provider),
    { gasLimit: 5000000 },
  );

  return {
    feeDistributor,
  };
}
