import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { ContractFactory, Contract } from 'ethers';
import StandardVerifierContract from '../../artifacts/contracts/verifier/StandardVerifier.sol/StandardVerifier.json';
import StandardVerificationKeys from '../../artifacts/contracts/verifier/keys/StandardVerificationKeys.sol/StandardVerificationKeys.json';

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

export class StandardVerifier {
  public verifier: Contract;

  constructor(
    private verifierContractAddress: EthAddress,
    private provider: EthereumProvider,
    private defaults: SendTxOptions = {},
  ) {
    this.verifier = new Contract(
      verifierContractAddress.toString(),
      StandardVerifierContract.abi,
      new Web3Provider(this.provider),
    );
  }

  static async deploy(provider: EthereumProvider, defaults: SendTxOptions = {}) {
    const { signingAddress } = defaults;
    const signer = new Web3Provider(provider).getSigner(signingAddress ? signingAddress.toString() : 0);
    
    const StandardverificationKeysLibrary = new ContractFactory(StandardVerificationKeys.abi, StandardVerificationKeys.bytecode, signer);
    const StandardverificationKeysLib = await StandardverificationKeysLibrary.deploy();
  

    const linkedVBytecode = linkBytecode(StandardVerifierContract, {
        StandardVerificationKeys: StandardverificationKeysLib.address,
    });
    const verifierFactory = new ContractFactory(StandardVerifierContract.abi, linkedVBytecode, signer);
    const verifier = await verifierFactory.deploy().catch(fixEthersStackTrace);
    return new StandardVerifier(EthAddress.fromString(verifier.address), provider, defaults);
  }

  get address() {
    return this.verifierContractAddress;
  }

  get contract() {
    return this.verifier;
  }

  async verify(proofData: Buffer, rollupSize: number, pubInputsHash: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = { ...options, ...this.defaults };
    const signer = new Web3Provider(this.provider).getSigner(signingAddress ? signingAddress.toString() : 0);
    const verifier = new Contract(this.verifierContractAddress.toString(), StandardVerifierContract.abi, signer);
    const txResponse = await verifier.verify(proofData, rollupSize, pubInputsHash, { gasLimit }).catch(fixEthersStackTrace);
    const receipt = await txResponse.wait();
    return receipt.gasUsed.toNumber();
  }
}
