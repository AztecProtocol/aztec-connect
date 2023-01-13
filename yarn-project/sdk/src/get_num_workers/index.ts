import isNode from 'detect-node';
import os from 'os';

export function getDeviceMemory() {
  return isNode ? os.totalmem() : navigator ? (navigator['deviceMemory'] as number) : undefined;
}

export function getNumCpu() {
  return isNode ? os.cpus().length : navigator.hardwareConcurrency;
}

export function getNumWorkers() {
  const nextLowestPowerOf2 = (n: number) => Math.pow(2, Math.floor(Math.log(n) / Math.log(2)));
  const numCPU = getNumCpu() || 2;
  return nextLowestPowerOf2(Math.min(numCPU, 8));
}
