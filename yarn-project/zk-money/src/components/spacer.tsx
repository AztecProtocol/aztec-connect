import { default as styled } from 'styled-components';
import { Spacing, spacings } from '../styles/index.js';

export const Spacer = styled.div<{ size?: Spacing }>`
  width: 100%;
  height: ${({ size }) => spacings[size ?? 's']};
`;
