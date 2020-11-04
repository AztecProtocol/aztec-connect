import { EthereumProvider, RequestArguments } from './ethereum_provider';

export class EthersAdapter implements EthereumProvider {
  constructor(private provider: { send: (method: string, params: any[]) => Promise<any> }) {}

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
