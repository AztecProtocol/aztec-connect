import isNode from 'detect-node';

export function fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (isNode) {
    const f = require('node-fetch').default;
    return f(input, init);
  } else {
    return window.fetch(input, init);
  }
}
