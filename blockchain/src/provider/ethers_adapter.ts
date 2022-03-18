import { EthereumProvider, RequestArguments } from '@aztec/barretenberg/blockchain/ethereum_provider';
import { Signer } from 'ethers';
import { Provider } from '@ethersproject/abstract-provider';

/**
 * Adapts an ethers provider into an EIP1193 compatible provider for injecting into the sdk.
 */
export class EthersAdapter implements EthereumProvider {
  private provider: { send: (method: string, params: any[]) => Promise<any> };

  constructor(ethersProvider: Signer | Provider) {
    if (ethersProvider instanceof Signer) {
      this.provider = ethersProvider.provider as any;
    } else {
      this.provider = ethersProvider as any;
    }
  }

  public request(args: RequestArguments): Promise<any> {
    return this.provider.send(args.method, args.params!);
  }

  on(): this {
    throw new Error('Events not supported.');
  }

  removeListener(): this {
    throw new Error('Events not supported.');
  }
}
