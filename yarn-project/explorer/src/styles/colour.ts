export const colours = {
  black: '#000000',
  greyDark: '#111113',
  white: '#ffffff',
  green: '#44FF9A',
  blue: '#4AD4F2',
  indigo: '#448FFF',
  violet: '#7856FF',
  orange: '#FFB444',
};
export type Colour = keyof typeof colours;

export const gradients = {
  primary: {
    from: '#944AF2',
    to: colours.indigo,
  },
  secondary: {
    from: colours.blue,
    to: colours.green,
  },
  tertiary: {
    from: '#BCF24A',
    to: '#44FF6D',
  },
};

export const systemStates = {
  error: '#ff565d',
  // warning: '',
};
