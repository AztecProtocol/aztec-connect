import isNode from 'detect-node';

export function fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (isNode) {
    // eslint-disable-next-line
    const f = require('node-fetch').default;
    return f(input, init);
  } else {
    if (typeof window !== 'undefined' && window.fetch) return window.fetch(input, init);
    if (typeof self !== 'undefined' && self.fetch) return self.fetch(input, init);
    throw new Error('`fetch` api unavailable.');
  }
}
