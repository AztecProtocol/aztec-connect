import { FontSize } from './typography';

export const inputSizes = {
  m: '48px',
  l: '56px',
};
export type InputSize = keyof typeof inputSizes;

export const inputFontSizeKeys: { [key in InputSize]: FontSize } = {
  m: 's',
  l: 'm',
};
