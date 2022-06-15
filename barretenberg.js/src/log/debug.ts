import debug from 'debug';

export const createDebugLogger = debug;

export function enableLogs(str: string) {
  debug.enable(str);
}
