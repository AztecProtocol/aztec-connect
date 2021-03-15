import React from 'react';
import styled from 'styled-components';
import { AccountState } from '../../app';
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
    href: 'https://discord.gg/QtnapCzE',
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
    name: 'Introducing Aztec 2',
    href: 'https://medium.com/aztec-protocol',
  },
];

const socialItems = [
  {
    name: 'Twitter',
    href: 'https://twitter.com/aztecnetwork',
  },
];

const accountSocialItems = (alias: string) => [
  ...socialItems,
  {
    name: 'Win 1 zkETH',
    to: `?alias=${alias}`,
  },
];

const FooterRoot = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${spacings.l};
  width: 100%;
  padding-top: ${spacings.l};
  background: ${colours.greyLight};
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

interface FooterProps {
  account?: AccountState;
}

export const Footer: React.FunctionComponent<FooterProps> = ({ account }) => (
  <FooterRoot>
    <ContentWrapper>
      <FooterContent>
        <FooterMenu title="Need Help?" menuItems={helpItems} />
        <FooterMenu title="About" menuItems={aboutItems} />
        <FooterMenu title="Social" menuItems={account?.alias ? accountSocialItems(account.alias) : socialItems} />
      </FooterContent>
      <Foot>
        <Text text="Made in London" size="xs" />
      </Foot>
    </ContentWrapper>
  </FooterRoot>
);
