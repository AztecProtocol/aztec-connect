import { Block } from 'blockchain';
import { BlockDao } from '../entity/block';

export function blockDaoToBlock(b: BlockDao) {
  const block: Block = {
    txHash: b.txHash,
    blockNum: b.id,
    rollupId: b.rollupId,
    dataStartIndex: b.dataStartIndex,
    numDataEntries: b.numDataEntries,
    dataEntries: [],
    nullifiers: [],
    viewingKeys: [],
  };
  for (let i = 0; i < b.dataEntries.length; i += 64) {
    block.dataEntries.push(b.dataEntries.slice(i, i + 64));
  }
  for (let i = 0; i < b.nullifiers.length; i += 16) {
    block.nullifiers.push(b.nullifiers.slice(i, i + 16));
  }
  for (let i = 0; i < b.viewingKeys.length; i += 176) {
    block.viewingKeys.push(b.viewingKeys.slice(i, i + 176));
  }
  return block;
}

export function blockToBlockDao(block: Block) {
  const blockDao = new BlockDao();
  blockDao.created = new Date();
  blockDao.id = block.blockNum;
  blockDao.txHash = block.txHash;
  blockDao.rollupId = block.rollupId;
  blockDao.dataStartIndex = block.dataStartIndex;
  blockDao.numDataEntries = block.numDataEntries;
  blockDao.dataEntries = Buffer.concat(block.dataEntries);
  blockDao.nullifiers = Buffer.concat(block.nullifiers);
  blockDao.viewingKeys = Buffer.concat(block.viewingKeys);
  return blockDao;
}
