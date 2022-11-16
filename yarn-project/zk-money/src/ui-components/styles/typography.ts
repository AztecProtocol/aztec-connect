export const fontFamily = {
  base: 'Sohne, serif',
  monospace: "'Sohne Mono', monospace",
};

export const fontSizes = {
  xl: '40px',
  l: '28px',
  m: '20px',
  s: '16px',
  xs: '14px',
  xxs: '12px',
};
export type FontSize = keyof typeof fontSizes;

export const lineHeights = {
  xl: '64px',
  l: '40px',
  m: '32px',
  s: '24px',
  xs: '20px',
  xxs: '16px',
};
export type LineHeight = keyof typeof lineHeights;

export const fontWeights = {
  normal: 400,
  semibold: 450,
  bold: 500,
};
export type FontWeight = keyof typeof fontWeights;
