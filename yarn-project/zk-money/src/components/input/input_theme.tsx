import { colours, defaultTextColour } from '../../styles/index.js';

export enum InputTheme {
  WHITE = 'WHITE',
  LIGHT = 'LIGHT',
}

export const inputTextColours: { [key in InputTheme]: string } = {
  [InputTheme.WHITE]: defaultTextColour,
  [InputTheme.LIGHT]: colours.white,
};
