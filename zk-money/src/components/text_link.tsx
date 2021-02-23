import React from 'react';
import styled from 'styled-components';
import { colours, defaultTextColour } from '../styles';
import { Text, TextColour, TextProps } from './text';
import { Link } from './link';

interface StyledTextLinkProps {
  color: TextColour;
  underline: boolean;
}

const StyledLink = styled(Link)<StyledTextLinkProps>`
  ${({ underline }) => underline && 'text-decoration: underline;'};

  ${({ color }: StyledTextLinkProps) => {
    if (color === 'gradient') return '';

    return `
      color: ${colours[color]};
      
      &:hover,
      &:active {
        color: ${colours[color]};
      }
    `;
  }}
`;

export interface TextLinkProps extends TextProps {
  className?: string;
  to?: string;
  href?: string;
  target?: '_blank';
  onClick?: () => void;
  color?: TextColour;
  underline?: boolean;
}

export const TextLink: React.FunctionComponent<TextLinkProps> = ({
  className,
  to,
  href,
  target,
  onClick,
  color = defaultTextColour,
  underline = false,
  ...textProps
}) => (
  <StyledLink
    className={className}
    color={color}
    underline={underline}
    to={to}
    href={href}
    target={target}
    onClick={onClick}
  >
    <Text {...textProps} color={color} />
  </StyledLink>
);
