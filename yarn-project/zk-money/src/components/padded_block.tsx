import { default as styled } from 'styled-components';
import { Spacing, spacings } from '../styles/index.js';

interface PaddedBlockProps {
  size?: Spacing;
  flex?: boolean;
}

export const PaddedBlock = styled.div<PaddedBlockProps>`
  padding: ${({ size }) => spacings[size || 's']} 0;
  ${({ flex }) => flex && 'display: flex;'}
`;
