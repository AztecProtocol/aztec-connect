import { fetch } from '../iso_fetch/index.js';
import { Deserializer } from '../serialize/index.js';
import { Block } from './block_source.js';

export async function awaitSucceed(fn: () => Promise<Response>) {
  while (true) {
    try {
      const response = await fn();
      if (response.status == 409) {
        const body = await response.json();
        this.emit('versionMismatch', body.error);
        throw new Error(body.error);
      }
      if (response.status !== 200) {
        throw new Error(`Bad status code: ${response.status}`);
      }
      return response;
    } catch (err: any) {
      console.log(err.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

export async function getBlocks(baseUrl: string, from?: number, take?: number, version = '') {
  const url = new URL(`${baseUrl}/get-blocks`);
  if (from !== undefined) {
    url.searchParams.append('from', from.toString());
  }
  if (take !== undefined) {
    url.searchParams.append('take', take.toString());
  }
  try {
    const init: RequestInit = version ? { headers: { version } } : {};
    const response = await awaitSucceed(() => fetch(url.toString(), init));
    const result = Buffer.from(await response.arrayBuffer());
    const des = new Deserializer(result);
    const latestRollupId = des.int32();
    const blocks = des.deserializeArray(Block.deserialize);
    return { latestRollupId, blocks };
  } catch (err) {
    throw new Error(`Bad response from: ${url}`);
  }
}
