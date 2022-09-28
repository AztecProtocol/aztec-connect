/* eslint-disable */
import { expect } from 'chai';

export const toMatchObject = (a: Object, b: Object) => {
  // TODO: Not fully tested this one.
  const entries = new Map(Object.entries(a));
  const map = new Map(Object.entries(b));

  expect(entries.keys()).to.deep.include(map.keys());

  // If array of simple elements. Just directly check against
  if (a instanceof Array && !(a[0] instanceof Object)) {
    if (a.length > 0) {
      expect(a).to.deep.include(b);
    } else {
      expect(a).to.deep.eq(b);
    }
    return;
  }

  for (const [key, value] of map) {
    if (!(value instanceof Object)) {
      expect(entries.get(key)).to.be.deep.eq(value);
    } else {
      toMatchObject(entries.get(key), value);
    }
  }
};
