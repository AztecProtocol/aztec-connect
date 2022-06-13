import { EthereumProvider, RequestArguments } from '@aztec/barretenberg/blockchain';
import { fetch } from '@aztec/barretenberg/iso_fetch';
import { sleep } from '@aztec/barretenberg/sleep';
import debug from 'debug';

const log = debug('json_rpc_provider');

function* backoffGenerator() {
  const v = [1, 1, 1, 2, 4, 8, 16, 32, 64];
  let i = 0;
  while (true) {
    yield v[Math.min(i++, v.length - 1)];
  }
}

export class JsonRpcProvider implements EthereumProvider {
  private id = 0;

  constructor(private host: string, private netMustSucceed = true) {}

  public async request({ method, params }: RequestArguments): Promise<any> {
    const body = {
      jsonrpc: '2.0',
      id: this.id++,
      method,
      params,
    };
    log(`->`, body);
    const res = await this.fetch(body);
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

  private async fetch(body: any) {
    const backoff = backoffGenerator();
    while (true) {
      let resp: Response;
      try {
        resp = await fetch(this.host, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json' },
        });
      } catch (err) {
        if (this.netMustSucceed) {
          const s = backoff.next().value!;
          console.log(`Network request failure. Will retry in ${s}s...`);
          console.log(err);
          await sleep(s * 1000);
          continue;
        }
        throw err;
      }

      if (!resp.ok) {
        if (this.netMustSucceed) {
          const s = backoff.next().value!;
          console.log(`Unexpected status code ${resp.status}. Will retry in ${s}s...`);
          await sleep(s * 1000);
          continue;
        }
        throw new Error(resp.statusText);
      }

      let text = '';
      try {
        text = await resp.text();
        return JSON.parse(text);
      } catch (err) {
        if (this.netMustSucceed) {
          const s = backoff.next().value!;
          console.log(`Parse failure. Will retry in ${s}s...`);
          console.log(`Response body: ${text}`);
          await sleep(s * 1000);
          continue;
        }
        throw err;
      }
    }
  }
}
