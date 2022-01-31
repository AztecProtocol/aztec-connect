import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { ContractFactory, Contract } from 'ethers';
import HashInputsContract from '../../artifacts/contracts/test/HashInputs.sol/HashInputs.json';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

function linkBytecode(artifact: any, libraries: any) {
  let bytecode = artifact.bytecode;
  for (const entry of Object.entries(artifact.linkReferences)) {
    const [, fileReferences]: any = entry;
    for (const fileEntry of Object.entries(fileReferences)) {
      const [libName, fixups]: any = fileEntry;
      const addr = libraries[libName];
      if (addr === undefined) {
        continue;
      }

      for (const fixup of fixups) {
        bytecode =
          bytecode.substr(0, 2 + fixup.start * 2) +
          addr.substr(2) +
          bytecode.substr(2 + (fixup.start + fixup.length) * 2);
      }
    }
  }

  return bytecode;
}

export class HashInputs {
  public hashInputs: Contract;

  constructor(
    private hashInputsContractAddress: EthAddress,
    private provider: EthereumProvider,
    private defaults: SendTxOptions = {},
  ) {
    this.hashInputs = new Contract(
      hashInputsContractAddress.toString(),
      HashInputsContract.abi,
      new Web3Provider(this.provider),
    );
  }

  static async deploy(provider: EthereumProvider, defaults: SendTxOptions = {}) {
    const { signingAddress } = defaults;
    const signer = new Web3Provider(provider).getSigner(signingAddress ? signingAddress.toString() : 0);



    const hashInputsFactory = new ContractFactory(HashInputsContract.abi, HashInputsContract.bytecode, signer);
    const hashInputs = await hashInputsFactory.deploy().catch(fixEthersStackTrace);
    return new HashInputs(EthAddress.fromString(hashInputs.address), provider, defaults);
  }

  get address() {
    return this.hashInputsContractAddress;
  }

  get contract() {
    return this.hashInputs;
  }

  async computePublicInputHash(proofData: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = { ...options, ...this.defaults };
    const signer = new Web3Provider(this.provider).getSigner(signingAddress ? signingAddress.toString() : 0);
    const hashInputs = new Contract(this.hashInputsContractAddress.toString(), HashInputsContract.abi, signer);
    const txResponse = await hashInputs.computePublicInputHash(proofData, { gasLimit }).catch(fixEthersStackTrace);
    const receipt = await txResponse.wait();
    return receipt.gasUsed.toNumber();
  }

  async validate(proofData: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = { ...options, ...this.defaults };
    const signer = new Web3Provider(this.provider).getSigner(signingAddress ? signingAddress.toString() : 0);
    const hashInputs = new Contract(this.hashInputsContractAddress.toString(), HashInputsContract.abi, signer);
    const txResponse = await hashInputs.verifyProofTest(proofData, { gasLimit }).catch(fixEthersStackTrace);
  }
}
