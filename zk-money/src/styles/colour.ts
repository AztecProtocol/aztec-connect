export const colours = {
  black: '#000000',
  greyLight: '#FAFAFA',
  grey: '#DADADA',
  white: '#ffffff',
  green: '#44FF9A',
  indigo: '#0094ff',
  violet: '#7856FF',
  orange: '#FFB444',
  yellow: '#FFD99F',
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
