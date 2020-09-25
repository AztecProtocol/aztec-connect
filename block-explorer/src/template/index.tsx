import React from 'react';
import styled from 'styled-components';
import { CookiesForm } from '../cookies_form';
import globeIcon from '../images/powerful-bg.svg';
import { SubscriptionForm } from '../subscription_form';
import { breakpoints, colours, spacings } from '../styles';
import { ContentWrapper } from './content_wrapper';
import { Footer } from './footer';
import { Header } from './header';

export * from './content_wrapper';
export * from './details_section';
export * from './info_content';
export * from './section';

const TemplateRoot = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: ${colours.black};
  color: ${colours.white};
  overflow: hidden;
`;

const BackgroundIcon = styled.img`
  position: absolute;
  width: 1544px;
  transform: translateX(50%) translateY(-50%);
  margin-top: 168px;
  margin-left: -20px;
  opacity: 0.35;
  pointer-events: none;
`;

const CookiesFormRoot = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${spacings.xl};
  display: flex;
  justify-content: center;
  z-index: 9;

  @media (max-width: ${parseInt(breakpoints.l) - parseInt(spacings.xl) * 2 + 1}px) {
    bottom: 0;
  }
`;

const CookiesFormWrapper = styled(ContentWrapper)`
  background: #1f2325;
`;

interface TemplateProps {
  children: React.ReactNode;
}

export const Template: React.FunctionComponent<TemplateProps> = ({ children }) => (
  <TemplateRoot>
    <BackgroundIcon src={globeIcon} />
    <ContentWrapper>
      <Header />
      {children}
      <SubscriptionForm />
    </ContentWrapper>
    <Footer />
    <CookiesFormRoot>
      <CookiesFormWrapper>
        <CookiesForm />
      </CookiesFormWrapper>
    </CookiesFormRoot>
  </TemplateRoot>
);
