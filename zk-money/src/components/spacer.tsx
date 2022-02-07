import styled from 'styled-components/macro';
import { Spacing, spacings } from '../styles';

export const Spacer = styled.div<{ size?: Spacing }>`
  width: 100%;
  height: ${({ size }) => spacings[size ?? 's']};
`;
