import { access, copyFile, exists, mkdir, readdir, readFile, rename, rmdir, stat, unlink, writeFile } from 'fs';
import { promisify } from 'util';

export const accessAsync = promisify(access);
export const existsAsync = promisify(exists);
export const renameAsync = promisify(rename);
export const mkdirAsync = promisify(mkdir);
export const unlinkAsync = promisify(unlink);
export const writeFileAsync = promisify(writeFile);
export const readFileAsync = promisify(readFile);
export const readdirAsync = promisify(readdir);
export const rmdirAsync = promisify(rmdir);
export const statAsync = promisify(stat);
export const copyFileAsync = promisify(copyFile);
