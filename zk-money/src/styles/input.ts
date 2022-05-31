import { FontSize } from './typography';

export const inputSizes = {
  s: '40px',
  m: '48px',
  l: '50px',
};
export type InputSize = keyof typeof inputSizes;

export const inputFontSizeKeys: { [key in InputSize]: FontSize } = {
  s: 'xs',
  m: 's',
  l: 'm',
};
