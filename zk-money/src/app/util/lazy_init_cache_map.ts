import { DeepMap, DeepMapKeyListConstraint } from './deep_map';

export class LazyInitCacheMap<TKey, TValue> {
  private cache = new Map<TKey, TValue>();
  constructor(private readonly creator: (key: TKey) => TValue) {}
  get(key: TKey) {
    let value = this.cache.get(key);
    if (value === undefined) {
      value = this.creator(key);
      this.cache.set(key, value);
    }
    return value;
  }
}

export class LazyInitDeepCacheMap<TKeyList extends DeepMapKeyListConstraint, TValue> {
  private cache = new DeepMap<TKeyList, TValue>();
  constructor(private readonly creator: (keyList: TKeyList) => TValue) {}
  get(keyList: TKeyList) {
    let value = this.cache.get(keyList);
    if (value === undefined) {
      value = this.creator(keyList);
      this.cache.set(keyList, value);
    }
    return value;
  }
}
