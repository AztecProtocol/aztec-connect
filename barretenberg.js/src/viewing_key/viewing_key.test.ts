import { randomBytes } from 'crypto';
import { ViewingKey } from './';

describe('viewing_key', () => {
  it('convert viewing key from and to buffer', () => {
    const buf = randomBytes(ViewingKey.SIZE);
    const key = new ViewingKey(buf);
    expect(key.toBuffer()).toEqual(buf);
  });

  it('convert viewing key from and to string', () => {
    const key = ViewingKey.random();
    const str = key.toString();
    const recovered = ViewingKey.fromString(str);
    expect(recovered).toEqual(key);
  });
});
