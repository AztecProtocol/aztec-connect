import { EthereumProvider, RequestArguments } from '@aztec/barretenberg/blockchain';
import { fetch } from '@aztec/barretenberg/iso_fetch';
import debug from 'debug';

const log = debug('json_rpc_provider');

export class JsonRpcProvider implements EthereumProvider {
  private id = 0;

  constructor(private host: string) {}

  public async request({ method, params }: RequestArguments): Promise<any> {
    const body = {
      jsonrpc: '2.0',
      id: this.id++,
      method,
      params,
    };
    log(`->`, body);
    const resp = await fetch(this.host, { method: 'POST', body: JSON.stringify(body) });
    const res = JSON.parse(await resp.text());
    log(`<-`, res);
    if (res.error) {
      throw res.error;
    }
    return res.result;
  }

  on(): this {
    throw new Error('Events not supported.');
  }

  removeListener(): this {
    throw new Error('Events not supported.');
  }
}
