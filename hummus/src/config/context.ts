import { createContext } from 'react';

export interface ThemeContext {
  theme: string;
  background: string;
  color: string;
  colorLight: string;
  link: string;
}

export const themes: { [key: string]: ThemeContext } = {
  light: {
    theme: 'light',
    background: 'white',
    color: 'grey-dark',
    colorLight: 'grey',
    link: 'secondary',
  },
  dark: {
    theme: 'dark',
    background: 'grey-darker',
    color: 'white',
    colorLight: 'white-lighter',
    link: 'white',
  },
};

export const ThemeContext = createContext(themes.dark);
