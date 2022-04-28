import isNode from 'detect-node';

const getWebCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof self !== 'undefined' && self.crypto) return self.crypto;
  return undefined;
};

export const randomBytes = (len: number) => {
  if (isNode) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('crypto').randomBytes(len) as Buffer;
  }

  const crypto = getWebCrypto();
  if (crypto) {
    const buf = Buffer.alloc(len);
    crypto.getRandomValues(buf);
    return buf;
  }

  throw new Error('randomBytes UnsupportedEnvironment');
};
