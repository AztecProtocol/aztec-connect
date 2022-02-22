import styled from 'styled-components/macro';
import { borderRadiuses, Theme, themeColours } from '../styles';

export const BorderBox = styled.div<{ area?: string }>`
  border: 1px solid ${themeColours[Theme.WHITE].border};
  border-radius: ${borderRadiuses.m};
  grid-area: ${({ area }) => area};
`;
