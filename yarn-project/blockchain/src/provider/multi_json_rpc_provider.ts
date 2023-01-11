import { EthereumProvider, RequestArguments } from '@aztec/barretenberg/blockchain';
import { JsonRpcProvider } from './json_rpc_provider.js';

export class MultiJsonRPCProvider implements EthereumProvider {
  private providers: JsonRpcProvider[];
  private currentIndex: number;

  constructor(providers: string[]) {
    this.providers = providers.map(host => new JsonRpcProvider(host));
    this.currentIndex = 0;
  }

  public async request({ method, params }: RequestArguments): Promise<any> {
    const currentProvider = this.providers[this.currentIndex];
    let res;
    try {
      res = await currentProvider.request({ method, params });
    } catch (err) {
      // Move onto the next provider if the current one has failed
      this.currentIndex++;
      if (this.currentIndex >= this.providers.length) {
        throw new Error('All providers failed');
      }
      // Recursively call request
      res = await this.request({ method, params });
    }
    return res;
  }

  public on(): this {
    throw new Error('Events not supported.');
  }

  public removeListener(): this {
    throw new Error('Events not supported.');
  }
}
