import React from 'react';
import styled from 'styled-components';
import { CookiesForm } from '../cookies_form';
import { breakpoints, colours, spacings } from '../../styles';
import { ContentWrapper } from './content_wrapper';
import { Header } from './header';

export * from './content_wrapper';
export * from './section';

const TemplateRoot = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(101.14deg, #940dff 11.12%, #0094ff 58.22%, #0094ff 58.22%);
  color: ${colours.white};
  overflow: hidden;
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

const CookiesFormWrapper = styled(ContentWrapper)``;

interface TemplateProps {
  children: React.ReactNode;
}

export const Template: React.FunctionComponent<TemplateProps> = ({ children }) => (
  <TemplateRoot>
    <ContentWrapper>
      <Header />
      {children}
    </ContentWrapper>
    <CookiesFormRoot>
      <CookiesFormWrapper>
        <CookiesForm />
      </CookiesFormWrapper>
    </CookiesFormRoot>
  </TemplateRoot>
);
