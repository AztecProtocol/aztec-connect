import isNode from 'detect-node';
export default isNode ? require('node-fetch') as typeof fetch : fetch;