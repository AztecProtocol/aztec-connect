export const colours = {
  black: '#000000',
  greyLight: '#FAFAFA',
  greyDark: '#F0F0F0',
  grey: '#A4A4A4',
  white: '#ffffff',
  green: '#44FF9A',
  indigo: '#0094ff',
  violet: '#7856FF',
  orange: '#FFB444',
  yellow: '#FFD99F',
  pink: '#F2E1FE',
};
export type Colour = keyof typeof colours;

export const gradients = {
  primary: {
    from: '#940dff',
    to: colours.indigo,
  },
  secondary: {
    from: '#1FE6CE',
    to: '#08DDC3',
  },
};

export const systemStates = {
  error: '#de4e54',
  warning: '#e08600',
};

export const defaultTextColour: Colour = 'black';
