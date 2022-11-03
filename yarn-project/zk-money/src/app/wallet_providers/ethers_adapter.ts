import { EthereumProvider } from '@aztec/sdk';

interface RequestArguments {
  readonly method: string;
  readonly params?: any[];
}

/**
 * Adapts an ethers provider into an EIP1193 compatible provider for injecting into the sdk.
 */
export class EthersAdapter implements EthereumProvider {
  constructor(private provider: { send: (method: string, params: any[]) => Promise<any> }) {}

  public request(args: RequestArguments): Promise<any> {
    return this.provider.send(args.method, args.params!);
  }

  on() {
    return this;
  }

  removeListener() {
    return this;
  }
}
