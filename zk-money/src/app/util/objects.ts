type SomeKey = string | number | symbol;

export function mapObj<TKey extends SomeKey, TValueIn, TValueOut>(
  object: Record<TKey, TValueIn>,
  mapper: (value: TValueIn, key: TKey) => TValueOut,
): Record<TKey, TValueOut> {
  const out: any = {};
  for (const k in object) out[k] = mapper(object[k], k);
  return out;
}

export function mapToObj<TKey extends SomeKey, TValueOut>(
  arr: TKey[],
  mapper: (key: TKey, idx: number) => TValueOut,
): Record<TKey, TValueOut> {
  const out: any = {};
  for (let idx = 0; idx < arr.length; idx++) {
    const k = arr[idx];
    out[k] = mapper(k, idx);
  }
  return out;
}
