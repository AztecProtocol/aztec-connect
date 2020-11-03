import { EthereumProvider, RequestArguments } from './ethereum_provider';
import { Web3Provider } from './web3_provider';

export class Web3Adapter implements EthereumProvider {
  private id = 0;

  constructor(private provider: Web3Provider) {}

  public request(args: RequestArguments): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = { jsonrpc: '2.0', id: this.id++, method: args.method, params: args.params || [] };

      this.provider.send(payload, (err, response) => {
        if (err) {
          return reject(err);
        }
        if (!response) {
          return reject(new Error('No response.'));
        }
        resolve(response.result);
      });
    });
  }

  on(): this {
    throw new Error('Events not supported.');
  }

  removeListener(): this {
    throw new Error('Events not supported.');
  }
}

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
