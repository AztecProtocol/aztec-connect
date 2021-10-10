import { SendTxOptions } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class ContractWithSigner {
  private readonly contract: Contract;

  constructor(contract: Contract, private options: SendTxOptions = {}) {
    const { provider, signingAddress } = options;
    const web3Provider = provider ? new Web3Provider(provider) : (contract.provider as Web3Provider);
    const ethSigner = web3Provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    this.contract = new Contract(contract.address, contract.interface, ethSigner);
  }

  async sendTx(functionName: string, ...args: any[]) {
    if (!this.contract[functionName]) {
      throw new Error(`Unknown contract function '${functionName}'.`);
    }

    const { gasLimit, gasPrice } = this.options;
    const tx = await this.contract[functionName](...args, { gasLimit, gasPrice }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }
}
