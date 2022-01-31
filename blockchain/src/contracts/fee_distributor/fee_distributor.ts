import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
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

  async aztecFeeClaimer() {
    return EthAddress.fromString(await this.feeDistributor.aztecFeeClaimer().catch(fixEthersStackTrace));
  }

  async feeLimit() {
    return BigInt(await this.feeDistributor.feeLimit().catch(fixEthersStackTrace));
  }

  async convertConstant() {
    return BigInt(await this.feeDistributor.convertConstant().catch(fixEthersStackTrace));
  }

  async txFeeBalance(asset: EthAddress) {
    return BigInt(await this.feeDistributor.txFeeBalance(asset.toString()).catch(fixEthersStackTrace));
  }

  async deposit(asset: EthAddress, amount: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract
      .deposit(asset.toString(), amount, {
        value: asset.equals(EthAddress.ZERO) ? amount : undefined,
        gasLimit,
      })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async convert(asset: EthAddress, minOutputValue: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.convert(asset.toString(), minOutputValue, { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setConvertConstant(constant: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.setConvertConstant(constant, { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setFeeLimit(constant: bigint, options: SendTxOptions = this.defaults) {
    const { gasLimit } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.setFeeLimit(constant, { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setFeeClaimer(address: EthAddress, options: SendTxOptions = this.defaults) {
    const { gasLimit } = options;
    const contract = this.getContractWithSigner(options);
    const tx = await contract.setFeeClaimer(address.toString(), { gasLimit }).catch(fixEthersStackTrace);
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
