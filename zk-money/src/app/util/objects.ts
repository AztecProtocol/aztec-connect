type SomeKey = string | number | symbol;
type MappedObj<TObj, TValue> = { [K in keyof TObj]: TValue };

export function mapObj<TObj extends {}, TValueOut>(
  object: TObj,
  mapper: (value: TObj[keyof TObj], key: keyof TObj) => TValueOut,
): MappedObj<TObj, TValueOut> {
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
