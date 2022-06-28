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

const staticHelpItems = [
  {
    name: 'Discord',
    href: 'https://discord.gg/c7kaz9s5kr',
  },
  {
    name: 'FAQ',
    href: 'https://docs.aztec.network/how-aztec-works/faq',
  },
  {
    name: 'Looking for the old site?',
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
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};
`;

const FooterContent = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  color: black;
  max-width: calc(1350px + 20%);
  width: 100%;
  align-self: center;
  padding: 0px 10%;
  margin: 40px auto;
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
  explorerUrl: string;
}

export function Footer(props: FooterProps) {
  const helpItems = [{ name: 'Block Explorer', href: props.explorerUrl }, ...staticHelpItems];
  return (
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
}
