import { default as styled } from 'styled-components';
import { borderRadiuses, Theme, themeColours } from '../styles/index.js';

export const BorderBox = styled.div<{ area?: string }>`
  border: 1px solid ${themeColours[Theme.WHITE].border};
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.075);
  border-radius: ${borderRadiuses.m};
  grid-area: ${({ area }) => area};
`;
