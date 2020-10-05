import { colours, Colour } from '../styles';

export * from './block_status_indicator';
export * from './block_status_text';

export type BlockStatus = 'CREATING' | 'CREATED' | 'PUBLISHED' | 'SETTLED';

export const blockStatusNames = {
  CREATING: 'PENDING',
  CREATED: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  SETTLED: 'SETTLED',
};

export const blockStatusColourNames: { [key in BlockStatus]: Colour } = {
  CREATING: 'blue',
  CREATED: 'blue',
  PUBLISHED: 'indigo',
  SETTLED: 'green',
};

export const blockStatusColours = {
  CREATING: colours.blue,
  CREATED: colours.blue,
  PUBLISHED: colours.indigo,
  SETTLED: colours.green,
};
