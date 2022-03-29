import debug from 'debug';

export const createLogger = debug;

export function enableLogs(str: string) {
  debug.enable(str);
}
