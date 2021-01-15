import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { AssetId, EthAddress, EthereumProvider } from 'aztec2-sdk';

const minimalRollupProcessorABI = ['function feeDistributor() external view returns (address)'];

const minimalFeeDistributorABI = [
  'event FeeReimbursed(address receiver, uint256 amount)',
  'function txFeeBalance(uint256 assetId) external view returns (uint256)',
  'function deposit(uint256 assetId, uint256 amount) external payable returns (uint256 depositedAmount)',
];

export const getFeeDistributorContract = async (
  rollupContractAddress: EthAddress,
  provider: EthereumProvider,
  signingAddress?: EthAddress,
) => {
  const web3provider = new Web3Provider(provider);
  const rollupProcessor = new Contract(rollupContractAddress.toString(), minimalRollupProcessorABI, web3provider);
  const signer = web3provider.getSigner(signingAddress ? signingAddress.toString() : 0);
  const feeDistributorAddress = await rollupProcessor.feeDistributor();
  return new Contract(feeDistributorAddress, minimalFeeDistributorABI, signer);
};

export const topUpFeeDistributorContract = async (
  amount: bigint,
  rollupContractAddress: EthAddress,
  provider: EthereumProvider,
  signingAddress?: EthAddress,
) => {
  const feeDistributor = await getFeeDistributorContract(rollupContractAddress, provider, signingAddress);
  await feeDistributor.deposit(AssetId.ETH, amount, { value: amount });
};
