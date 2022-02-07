import styled from 'styled-components/macro';
import { Spacing, spacings } from '../styles';

interface PaddedBlockProps {
  size?: Spacing;
  flex?: boolean;
}

export const PaddedBlock = styled.div<PaddedBlockProps>`
  padding: ${({ size }) => spacings[size || 's']} 0;
  ${({ flex }) => flex && 'display: flex;'}
`;
