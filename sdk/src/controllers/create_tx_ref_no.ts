import { randomBytes } from 'crypto';

export const createTxRefNo = () => randomBytes(4).readUInt32BE(0);
