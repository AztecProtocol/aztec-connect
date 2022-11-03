export type DeepMapKeyListConstraint = unknown[];

export class DeepMap<TKeyList extends DeepMapKeyListConstraint, TValue> {
  root = new Map<unknown, unknown>();

  get(keyPath: TKeyList): TValue | undefined {
    let node: any = this.root;
    for (let i = 0; i < keyPath.length; i++) {
      const key = keyPath[i];
      node = node.get(key);
      if (node === undefined) return;
    }
    return node;
  }

  set(keyPath: TKeyList, value: TValue) {
    const mapKeys = [...keyPath];
    const valueKey = mapKeys.pop();
    let node: any = this.root;
    for (const mapKey of mapKeys) {
      const childNode = node.get(mapKey);
      if (!childNode) {
        const newNode = new Map<unknown, unknown>();
        node.set(mapKey, newNode);
        node = newNode;
      } else {
        node = childNode;
      }
    }
    node.set(valueKey, value);
  }
}
