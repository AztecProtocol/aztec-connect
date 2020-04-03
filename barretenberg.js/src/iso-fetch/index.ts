import isNode from 'detect-node';

export default function fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (isNode) {
    const f = require('node-fetch');
    return f(input, init);
  } else {
    return window.fetch(input, init);
  }
}
