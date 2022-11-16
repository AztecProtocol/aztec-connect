import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor.js';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthersAdapter } from '../../../provider/index.js';
import { AztecFeeDistributor } from '../../../abis.js';

const gasLimit = 5000000;

export async function setupFeeDistributor(
  publisher: Signer,
  rollupProcessorAddress: EthAddress,
  uniswapRouterAddress: EthAddress,
) {
  const feeOwner = await publisher.getAddress();
  const aztecFeeDistributorFactory = new ContractFactory(
    AztecFeeDistributor.abi,
    AztecFeeDistributor.bytecode,
    publisher,
  );

  const feeDistributorContract = await aztecFeeDistributorFactory.deploy(
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
