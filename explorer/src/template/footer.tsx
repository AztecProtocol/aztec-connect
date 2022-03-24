import React from 'react';
import styled from 'styled-components';
import logo from '../images/aztec-logo.svg';
import globeIcon from '../images/powerful-bg.svg';
import { colours, fontSizes, fontWeights, lineHeights, spacings, breakpoints } from '../styles';
import { ContentWrapper } from './content_wrapper';
import { FooterMenu } from './footer_menu';

const documentationItems = [
  {
    name: 'Github',
    href: 'https://github.com/AztecProtocol',
  },
  {
    name: 'Aztec 1.0 Docs',
    href: 'https://docs.aztecprotocol.com/',
  },
  {
    name: 'Whitepaper',
    href: 'https://eprint.iacr.org/2019/953.pdf',
  },
];

const companyItems = [
  {
    name: 'Blog',
    href: 'https://medium.com/aztec-protocol',
  },
  {
    name: 'Privacy Policy',
    href: 'https://www.aztecprotocol.com/privacy',
  },
];

const socialItems = [
  {
    name: 'Twitter',
    href: 'https://twitter.com/aztecprotocol',
  },
  {
    name: 'Telegram',
    href: 'https://t.me/aztecprotocol',
  },
  {
    name: 'Discord',
    href: 'https://discord.gg/Ge9scQ',
  },
  {
    name: 'PLONK Café',
    href: 'https://github.com/AztecProtocol',
  },
];

const FooterRoot = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${spacings.l};
  width: 100%;
  padding-top: ${spacings.xl};
  background: ${colours.greyDark};
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};
  font-weight: ${fontWeights.light};
`;

const StyledContent = styled(ContentWrapper)`
  position: relative;
`;

const FooterContent = styled.div`
  position: relative;
  display: flex;
  padding: ${spacings.xl} 0;
  z-index: 1;

  @media (max-width: ${breakpoints.s}) {
    flex-wrap: wrap;
    justify-content: space-between;
  }
`;

const Logo = styled.img`
  width: 120px;
`;

const PrimaryCol = styled.div`
  flex: 1 1 auto;
  padding: ${spacings.xs} 0;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    flex-shrink: 0;
  }
`;

const Col = styled.div`
  flex-shrink: 0;
  padding-left: ${parseInt(spacings.xxl) * 2}px;

  @media (max-width: ${breakpoints.m}) {
    padding-left: ${parseInt(spacings.xxl) + parseInt(spacings.xl)}px;
  }

  @media (max-width: ${breakpoints.s}) {
    padding: 0;
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.m} 0;
    width: 100%;
  }
`;

const Foot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.xl} 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
  z-index: 1;

  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
    flex-direction: column;
    align-items: flex-end;
    font-size: ${fontSizes.xs};
  }
`;

const GlobeBg = styled.img`
  position: absolute;
  left: 0;
  top: 0;
  width: 1200px;
  margin-left: -720px;
  margin-top: -240px;
  opacity: 0.3;
  pointer-events: none;
`;

export const Footer: React.FunctionComponent = () => (
  <FooterRoot>
    <StyledContent>
      <FooterContent>
        <PrimaryCol>
          <Logo src={logo} />
        </PrimaryCol>
        <Col>
          <FooterMenu title="Documentation" menuItems={documentationItems} />
        </Col>
        <Col>
          <FooterMenu title="Company" menuItems={companyItems} />
        </Col>
        <Col>
          <FooterMenu title="Social" menuItems={socialItems} />
        </Col>
      </FooterContent>
      <Foot>
        <address>{'2 Leonard Circus London'}</address>
        {'© 2020 Spilsbury Holdings Ltd.'}
      </Foot>
      <GlobeBg src={globeIcon} />
    </StyledContent>
  </FooterRoot>
);
