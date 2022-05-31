import React from 'react';
import styled from 'styled-components/macro';
import { colours, fontSizes, lineHeights, spacings, breakpoints } from '../../styles';
import { PaddedBlock } from '../padded_block';
import { Text } from '../text';
import { TextLink } from '../text_link';
import { ContentWrapper } from './content_wrapper';

interface MenuItem {
  name: string;
  href?: string;
  to?: string;
}

const helpItems = [
  {
    name: 'Block Explorer',
    href: 'https://explorer.aztec.network/',
  },
  {
    name: 'Discord',
    href: 'https://discord.gg/c7kaz9s5kr',
  },
  {
    name: 'FAQ',
    href: 'https://aztec-protocol.gitbook.io/zk-money/',
  },
  {
    name: 'Looking for V1?',
    href: 'https://old.zk.money/',
  },
];

const aboutItems = [
  {
    name: 'Medium',
    href: 'https://medium.com/aztec-protocol',
  },
];

const socialItems = [
  {
    name: 'Twitter',
    href: 'https://twitter.com/aztecnetwork',
  },
];

const FooterRoot = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 80px;
  width: 100%;
  background: ${colours.greyLight};
  padding: 0 10%;
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};
`;

const FooterContent = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: ${spacings.xl} 0;
  z-index: 1;

  @media (max-width: ${breakpoints.s}) {
    flex-direction: column;
    padding: ${spacings.s} 0;
  }
`;

const Col = styled.div`
  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.xs} 0;
  }
`;

const MenuLink = styled(TextLink)`
  display: inline-block;
`;

interface FooterMenuProps {
  title: string;
  menuItems: MenuItem[];
}

export const FooterMenu: React.FunctionComponent<FooterMenuProps> = ({ title, menuItems }) => (
  <Col>
    <PaddedBlock size="s">
      <Text text={title} size="m" weight="bold" />
    </PaddedBlock>
    {menuItems.map(({ name, href, to }) => (
      <PaddedBlock key={name} size="xs">
        <MenuLink text={name} to={to} href={href} target={href ? '_blank' : undefined} size="s" />
      </PaddedBlock>
    ))}
  </Col>
);

const Foot = styled.div`
  display: flex;
  justify-content: center;
  padding: ${spacings.l} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.m} 0;
  }
`;

export const Footer: React.FunctionComponent = () => (
  <FooterRoot>
    <ContentWrapper>
      <FooterContent>
        <FooterMenu title="Need Help?" menuItems={helpItems} />
        <FooterMenu title="About" menuItems={aboutItems} />
        <FooterMenu title="Social" menuItems={socialItems} />
      </FooterContent>
      <Foot>
        <Text text="Made in London" size="xs" />
      </Foot>
    </ContentWrapper>
  </FooterRoot>
);
