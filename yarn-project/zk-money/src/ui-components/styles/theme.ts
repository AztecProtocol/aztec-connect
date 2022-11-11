export enum Theme {
  GRADIENT = 'GRADIENT',
  WHITE = 'WHITE',
}

interface ThemeColour {
  text: string;
  border: string;
}

export const themeColours: { [key in Theme]: ThemeColour } = {
  [Theme.GRADIENT]: {
    text: '#ffffff',
    border: '#ffffff',
  },
  [Theme.WHITE]: {
    text: '#000000',
    border: '#E2E2E2',
  },
};
