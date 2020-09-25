// Most commonly used screen sizes:
// 360×640
// 1366×768
// 1920×1080
// 375×667
// 360×720
// 768×1024
export const breakpoints = {
  xxs: '0px',
  xs: '640px',
  s: '900px',
  m: '1080px',
  l: '1366px',
  xl: '1920px',
};
export type Breakpoint = keyof typeof breakpoints;

export const spacings = {
  xxl: '64px',
  xl: '40px',
  l: '32px',
  m: '24px',
  s: '16px',
  xs: '8px',
  xxs: '4px',
};
export type Spacing = keyof typeof spacings;

export const borderRadius = '4px';

const sizes = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] as const;
export type Size = typeof sizes[number];

export const sizeGt = (b1: Size, b2: Size) => sizes.indexOf(b1) > sizes.indexOf(b2);
export const sizeGte = (b1: Size, b2: Size) => sizes.indexOf(b1) >= sizes.indexOf(b2);
export const sizeLt = (b1: Size, b2: Size) => sizes.indexOf(b1) < sizes.indexOf(b2);
export const sizeLte = (b1: Size, b2: Size) => sizes.indexOf(b1) <= sizes.indexOf(b2);
