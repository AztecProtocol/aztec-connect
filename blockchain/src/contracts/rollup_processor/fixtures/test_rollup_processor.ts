import { RollupProcessor } from '../rollup_processor';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Contract } from 'ethers';
import { abi } from '../../../artifacts/contracts/test/TestRollupProcessor.sol/TestRollupProcessor.json';
import { Web3Provider } from '@ethersproject/providers';

export class TestRollupProcessor extends RollupProcessor {
  constructor(
    protected rollupContractAddress: EthAddress,
    provider: EthereumProvider,
    protected defaults: SendTxOptions = { gasLimit: 1000000 },
  ) {
    super(rollupContractAddress, provider, defaults);
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
    const { gasLimit, gasPrice } = { ...this.defaults };
    await contract.stubAsyncTransactionHashesLength(size, { gasLimit, gasPrice });
  }

  async stubTransactionHashes(size: number) {
    const contract = this.getContractWithSigner({});
    const { gasLimit, gasPrice } = { ...this.defaults };
    await contract.stubTransactionHashesLength(size, { gasLimit, gasPrice });
  }

  async stubReentrancyGuard(size: boolean) {
    const contract = this.getContractWithSigner({});
    const { gasLimit, gasPrice } = { ...this.defaults };
    await contract.stubReentrancyGuard(size, { gasLimit, gasPrice });
  }
}
