import isNode from 'detect-node';
import os from 'os';

export function getNumWorkers() {
  const nextLowestPowerOf2 = (n: number) => Math.pow(2, Math.floor(Math.log(n) / Math.log(2)));
  const numCPU = !isNode ? navigator.hardwareConcurrency || 2 : os.cpus().length;
  return nextLowestPowerOf2(Math.min(numCPU, 8));
}
