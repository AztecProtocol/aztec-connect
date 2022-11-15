import { default as styled } from 'styled-components';
import { Spacing, spacings } from '../ui-components/styles/layout.js';

export const Spacer = styled.div<{ size?: Spacing }>`
  width: 100%;
  height: ${({ size }) => spacings[size ?? 's']};
`;
