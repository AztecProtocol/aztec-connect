import { RollupProcessor } from '../rollup_processor';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Contract } from 'ethers';
import { abi } from '../../../artifacts/contracts/test/TestRollupProcessor.sol/TestRollupProcessor.json';
import { Web3Provider } from '@ethersproject/providers';

export class TestRollupProcessor extends RollupProcessor {
  constructor(protected rollupContractAddress: EthAddress, provider: EthereumProvider) {
    super(rollupContractAddress, provider);
    this.rollupProcessor = new Contract(rollupContractAddress.toString(), abi, this.provider);
  }

  protected getContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.rollupContractAddress.toString(), abi, ethSigner);
  }

  async stubAsyncTransactionHashes(size: number) {
    const contract = this.getContractWithSigner({});
    await contract.stubAsyncTransactionHashesLength(size);
  }

  async stubTransactionHashes(size: number) {
    const contract = this.getContractWithSigner({});
    await contract.stubTransactionHashesLength(size);
  }

  async stubReentrancyGuard(size: boolean) {
    const contract = this.getContractWithSigner({});
    await contract.stubReentrancyGuard(size);
  }

  async foo() {
    const result = +(await this.rollupProcessor.foo());
    return result;
  }
}
