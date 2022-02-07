import React from 'react';
import styled, { css } from 'styled-components/macro';
import { colours, defaultTextColour } from '../styles';
import { Text, TextColour, TextProps } from './text';
import { Link } from './link';

type HoverEffect = 'underline';

const hoverEffects = {
  underline: css`
    text-decoration: underline;
  `,
};

interface StyledTextLinkProps {
  color: TextColour;
  underline: boolean;
  inline: boolean;
  hover?: HoverEffect;
}

const StyledLink = styled(Link)<StyledTextLinkProps>`
  ${({ inline }) => inline && 'display: inline-block;'}
  ${({ underline }) => underline && 'text-decoration: underline;'};

  ${({ color, hover }) => {
    if (color === 'gradient') return '';

    return `
      color: ${colours[color]};
      
      &:hover,
      &:active {
        color: ${colours[color]};
        ${hover ? hoverEffects[hover] : ''}
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
  hover?: HoverEffect;
}

export const TextLink: React.FunctionComponent<TextLinkProps> = ({
  className,
  to,
  href,
  target,
  onClick,
  color = defaultTextColour,
  underline = false,
  inline = false,
  hover,
  ...textProps
}) => (
  <StyledLink
    className={className}
    color={color}
    underline={underline}
    inline={inline}
    hover={hover}
    to={to}
    href={href}
    target={target}
    onClick={onClick}
  >
    <Text {...textProps} color={color} />
  </StyledLink>
);
