import { colours, defaultTextColour } from '../../styles';

export enum InputTheme {
  WHITE = 'WHITE',
  LIGHT = 'LIGHT',
}

export const inputTextColours: { [key in InputTheme]: string } = {
  [InputTheme.WHITE]: defaultTextColour,
  [InputTheme.LIGHT]: colours.white,
};
