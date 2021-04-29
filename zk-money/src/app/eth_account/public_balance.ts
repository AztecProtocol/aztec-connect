import { AssetId, EthAddress } from '@aztec/sdk';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { ValueSubscriber } from './value_subscriber';

const abi = ['function balanceOf(address account) public view returns (uint256)'];

export class PublicBalance extends ValueSubscriber {
  private contract?: Contract;

  constructor(
    private address: EthAddress | undefined,
    private web3Provider: Web3Provider | undefined,
    private assetId: AssetId,
    assetAddress: EthAddress | undefined,
    interval: number,
  ) {
    super(interval);
    if (web3Provider && assetAddress && assetId !== AssetId.ETH) {
      this.contract = new Contract(assetAddress.toString(), abi, web3Provider);
    }
  }

  protected async getValue() {
    if (!this.address) {
      return 0n;
    }

    if (this.assetId === AssetId.ETH) {
      return BigInt(await this.web3Provider!.getBalance(this.address.toString()));
    }

    return this.contract ? BigInt(await this.contract.balanceOf(this.address.toString())) : 0n;
  }
}
