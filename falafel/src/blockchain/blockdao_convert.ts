import { Block } from 'blockchain';
import { BlockDao } from '../entity/block';

export function blockDaoToBlock(blockDao: BlockDao) {
  const { id, ...rest } = blockDao;
  const block: Block = {
    ...rest,
  };
  return block;
}

export function blockToBlockDao(block: Block) {
  const blockDao = new BlockDao();
  blockDao.txHash = block.txHash;
  blockDao.created = block.created;
  blockDao.rollupId = block.rollupId;
  blockDao.rollupSize = block.rollupSize;
  blockDao.rollupProofData = block.rollupProofData;
  blockDao.viewingKeysData = block.viewingKeysData;
  return blockDao;
}
