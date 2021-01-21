import { FontSize } from './typography';
import { colours } from './colour';

export const inputSizes = {
  m: '48px',
  l: '56px',
};
export type InputSize = keyof typeof inputSizes;

export const inputFontSizeKeys: { [key in InputSize]: FontSize } = {
  m: 's',
  l: 'm',
};

export const inputThemes = {
  white: colours.white,
  green: 'rgba(12, 43, 34, 0.8)',
};
export type InputTheme = keyof typeof inputThemes;
