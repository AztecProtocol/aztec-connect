import { FontSize } from './typography';

export const inputSizes = {
  s: '40px',
  m: '48px',
  l: '56px',
};
export type InputSize = keyof typeof inputSizes;

export const inputFontSizeKeys: { [key in InputSize]: FontSize } = {
  s: 'xs',
  m: 's',
  l: 'm',
};
