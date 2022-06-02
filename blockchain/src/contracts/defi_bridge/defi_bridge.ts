import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { abi } from '../../artifacts/contracts/interfaces/IDefiBridge.sol/IDefiBridge.json';
import { ContractWithSigner } from '../contract_with_signer';

export class DefiBridge {
  public readonly contract: Contract;
  private provider: Web3Provider;

  constructor(
    public address: EthAddress,
    provider: EthereumProvider,
    private defaultOptions: SendTxOptions = { gasLimit: 1000000 },
  ) {
    this.provider = new Web3Provider(provider);
    this.contract = new Contract(address.toString(), abi, this.provider);
  }

  async finalise(
    inputAsset: EthAddress,
    outputAssetA: EthAddress,
    outputAssetB: EthAddress,
    bitConfig: number,
    interactionNonce: number,
    options: SendTxOptions = {},
  ) {
    const contract = new ContractWithSigner(this.contract, { ...this.defaultOptions, ...options });
    return await contract.sendTx(
      'finalise',
      inputAsset.toString(),
      outputAssetA.toString(),
      outputAssetB.toString(),
      interactionNonce,
      bitConfig,
    );
  }
}
