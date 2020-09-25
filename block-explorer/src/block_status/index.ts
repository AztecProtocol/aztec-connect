import { colours, Colour } from '../styles';

export * from './block_status_indicator';
export * from './block_status_text';

export type BlockStatus = 'CREATING' | 'CREATED' | 'PUBLISHED' | 'SETTLED';

export const blockStatusNames = {
  CREATING: 'PENDING',
  CREATED: 'PENDING',
  PUBLISHED: 'PENDING',
  SETTLED: 'SETTLED',
};

export const blockStatusColourNames: { [key in BlockStatus]: Colour } = {
  CREATING: 'blue',
  CREATED: 'blue',
  PUBLISHED: 'blue',
  SETTLED: 'green',
};

export const blockStatusColours = {
  CREATING: colours.blue,
  CREATED: colours.blue,
  PUBLISHED: colours.blue,
  SETTLED: colours.green,
};
