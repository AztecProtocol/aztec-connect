import { asyncForEach } from './async_for_each';

export async function asyncMap<T, R>(arr: T[], mapTo: (t: T, n: number) => Promise<R>) {
  const resultMap: R[] = [];
  await asyncForEach(arr, async (val: T, i: number) => {
    const result = await mapTo(val, i);
    resultMap.push(result);
  });

  return resultMap;
}
