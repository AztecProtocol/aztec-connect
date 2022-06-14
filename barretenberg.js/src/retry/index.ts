import { sleep } from '../sleep';

export function* backoffGenerator() {
  const v = [1, 1, 1, 2, 4, 8, 16, 32, 64];
  let i = 0;
  while (true) {
    yield v[Math.min(i++, v.length - 1)];
  }
}

export async function retry<Result>(fn: () => Promise<Result>, name = 'Operation', backoff = backoffGenerator()) {
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const s = backoff.next().value;
      if (s === undefined) {
        throw err;
      }
      console.log(`${name} failed. Will retry in ${s}s...`);
      console.log(err);
      await sleep(s * 1000);
      continue;
    }
  }
}
