import * as pathTools from 'path';
import { getInitData } from './init_config.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const resolvePath = (relPath: string) => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return pathTools.resolve(__dirname, relPath);
};

export class InitAccountFiles {
  public static getAccountDataFile(chainId: number) {
    if (!getInitData(chainId).accountsData) {
      return undefined;
    }
    const relPathToFile = getInitData(chainId).accountsData;
    const fullPath = resolvePath(relPathToFile);
    return fullPath;
  }
}
