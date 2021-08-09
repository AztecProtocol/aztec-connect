import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { abi } from '../../artifacts/contracts/AztecFeeDistributor.sol/AztecFeeDistributor.json';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class FeeDistributor {
  public feeDistributor: Contract;

  constructor(
    private feeDistributorContractAddress: EthAddress,
    private provider: EthereumProvider,
    private defaults: SendTxOptions = {},
  ) {
    this.feeDistributor = new Contract(feeDistributorContractAddress.toString(), abi, new Web3Provider(this.provider));
  }

  get address() {
    return this.feeDistributorContractAddress;
  }

  get contract() {
    return this.feeDistributor;
  }

  async WETH() {
    return EthAddress.fromString(await this.feeDistributor.WETH().catch(fixEthersStackTrace));
  }

  async convertConstant() {
    return BigInt(await this.feeDistributor.convertConstant().catch(fixEthersStackTrace));
  }

  async reimburseConstant() {
    return BigInt(await this.feeDistributor.reimburseConstant().catch(fixEthersStackTrace));
  }

  async txFeeBalance(asset: EthAddress) {
    return BigInt(await this.feeDistributor.txFeeBalance(asset.toString()).catch(fixEthersStackTrace));
  }

  async deposit(asset: EthAddress, amount: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit, gasPrice } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract
      .deposit(asset.toString(), amount, {
        value: asset.equals(EthAddress.ZERO) ? amount : undefined,
        gasLimit,
        gasPrice,
      })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async reimburseGas(
    gasUsed: bigint,
    feeLimit: bigint,
    feeReceiver: EthAddress,
    options: SendTxOptions = this.defaults,
  ) {
    const { gasLimit, gasPrice } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract
      .reimburseGas(gasUsed, feeLimit, feeReceiver.toString(), { gasLimit, gasPrice })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async convert(asset: EthAddress, minOutputValue: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit, gasPrice } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract
      .convert(asset.toString(), minOutputValue, { gasLimit, gasPrice })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setConvertConstant(constant: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit, gasPrice } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.setConvertConstant(constant, { gasLimit, gasPrice }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setReimburseConstant(constant: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit, gasPrice } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.setReimburseConstant(constant, { gasLimit, gasPrice }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getLastReimbursement() {
    const eventFilter = this.feeDistributor.filters.FeeReimbursed();
    const events = await this.feeDistributor.queryFilter(eventFilter);
    const lastEvent = events[events.length - 1];
    return BigInt(lastEvent.args!.amount);
  }

  private getContractWithSigner(options: SendTxOptions) {
    const { provider = this.provider, signingAddress } = options;
    const ethSigner = new Web3Provider(provider).getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.feeDistributorContractAddress.toString(), abi, ethSigner);
  }
}
