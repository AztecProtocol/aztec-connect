import styled from 'styled-components';
import { BorderRadius, borderRadiuses, colours, gradients, Spacing, spacings } from '../styles';

interface GradientBlockProps {
  padding?: Spacing;
  borderRadius?: BorderRadius;
}

export const GradientBlock = styled.div<GradientBlockProps>`
  display: flex;
  align-items: center;
  padding: ${({ padding = 'm' }) => spacings[padding]};
  border-radius: ${({ borderRadius = 'm' }) => borderRadiuses[borderRadius]};
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  color: ${colours.white};
`;
