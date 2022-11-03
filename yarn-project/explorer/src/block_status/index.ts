import { Colour } from '../styles/index.js';

export * from './block_status_indicator.js';
export * from './block_status_text.js';

export enum BlockStatus {
  CREATING = 'CREATING',
  PUBLISHED = 'PUBLISHED',
  SETTLED = 'SETTLED',
}

export const blockStatusNames: { [key in BlockStatus]: string } = {
  CREATING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  SETTLED: 'SETTLED',
};

export const blockStatusColours: { [key in BlockStatus]: Colour } = {
  CREATING: 'blue',
  PUBLISHED: 'indigo',
  SETTLED: 'green',
};

export const getBlockStatus = (block?: { ethTxHash?: string; mined?: Date }) => {
  if (block?.mined) {
    return BlockStatus.SETTLED;
  }
  if (block?.ethTxHash) {
    return BlockStatus.PUBLISHED;
  }
  return BlockStatus.CREATING;
};
