import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { colours, Colour } from '../styles';
import { Text, TextProps } from './text';

interface ButtonProps {
  className?: string;
  to?: string;
  href?: string;
  target?: '_blank';
  onClick?: () => void;
  children: React.ReactNode;
}

const Button: React.FunctionComponent<ButtonProps> = ({ className, to, href, target, onClick, children }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement, MouseEvent>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  if (to) {
    return (
      <Link className={className} to={to} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={className} href={href} target={target} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
};

interface StyledTextLinkProps {
  color: Colour;
}

const StyledLink = styled(Button)`
  color: ${({ color }: StyledTextLinkProps) => colours[color]};

  &:hover,
  &:active {
    color: ${({ color }: StyledTextLinkProps) => colours[color]};
  }
`;

export interface TextLinkProps extends TextProps {
  className?: string;
  to?: string;
  href?: string;
  target?: '_blank';
  onClick?: () => void;
  color?: Colour;
}

export const TextLink: React.FunctionComponent<TextLinkProps> = ({
  className,
  to,
  href,
  target,
  onClick,
  color = 'white',
  ...textProps
}) => (
  <StyledLink className={className} color={color} to={to} href={href} target={target} onClick={onClick}>
    <Text {...textProps} />
  </StyledLink>
);
