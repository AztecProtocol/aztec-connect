import React from 'react';
import styled from 'styled-components';
import { Text, TextLink } from '../components';
import { spacings } from '../styles';

const Item = styled.div`
  padding: ${spacings.xs} 0;
`;

const StyledTextLink = styled(TextLink)`
  display: inline-block;
  color: rgba(255, 255, 255, 0.4);

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
`;

interface MenuItem {
  name: string;
  href?: string;
  to?: string;
}

interface FooterMenuProps {
  title: string;
  menuItems: MenuItem[];
}

export const FooterMenu: React.FunctionComponent<FooterMenuProps> = ({ title, menuItems }) => (
  <>
    <Item>
      <Text text={title} color="white" weight="normal" />
    </Item>
    {menuItems.map(({ name, href, to }) => (
      <Item key={name}>
        <StyledTextLink text={name} to={to} href={href} target={href ? '_blank' : undefined} />
      </Item>
    ))}
  </>
);
