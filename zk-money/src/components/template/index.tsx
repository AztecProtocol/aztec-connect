import React, { useState } from 'react';
import styled, { css } from 'styled-components/macro';
import { AccountState, SystemMessage } from '../../app';
import { breakpoints, colours, gradients, spacings, Theme } from '../../styles';
import { CookiesForm, isCookieAccepted } from '../cookies_form';
import { SystemMessagePopup } from './system_message_popup';
import { ContentWrapper } from './content_wrapper';
import { Footer } from './footer';

export * from './content_wrapper';
export * from './section';
export * from './system_message_popup';

interface RootProps {
  theme: Theme;
}

const rootStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
`;

const WhiteRoot = styled.div<RootProps>`
  ${rootStyle};
  background: linear-gradient(
    101.14deg,
    white 0%,
    white 33.333%,
    ${gradients.primary.from} 66.666%,
    ${gradients.primary.from} 69%,
    ${gradients.primary.to} 82%
  );
  background-size: 300% 300%;
  background-position: ${({ theme }) =>
    theme === Theme.WHITE ? '0% 0%;' : theme === Theme.GRADIENT ? '100% 100%;' : '0% 0%;'};
  transition: background-position 1.25s ease;
  color: ${({ theme }) => (theme === Theme.GRADIENT ? `${colours.white}` : `${colours.black}`)};
`;

interface ContentRootProps {
  extraFooterSpace: boolean;
}

const ContentRoot = styled(ContentWrapper)<ContentRootProps>`
  ${({ extraFooterSpace }) => extraFooterSpace && 'padding-bottom: 160px;'}

  @media (max-width: ${breakpoints.m}) {
    ${({ extraFooterSpace }) => extraFooterSpace && 'padding-bottom: 216px;'}
  }
`;

const CookiesFormRoot = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${spacings.xl};
  display: flex;
  justify-content: center;
  z-index: 9;

  @media (max-width: ${breakpoints.l}) {
    bottom: ${spacings.l};
  }

  @media (max-width: ${breakpoints.m}) {
    bottom: ${spacings.m};
  }
`;

interface TemplateProps {
  theme: Theme;
  children: React.ReactNode;
  account?: AccountState;
  systemMessage?: SystemMessage;
  isLoading?: boolean;
}

export const Template: React.FunctionComponent<TemplateProps> = ({
  theme,
  children,
  account,
  systemMessage,
  isLoading = false,
}) => {
  const [withCookie, setWithCookie] = useState(!isCookieAccepted());

  return (
    <WhiteRoot theme={theme}>
      <ContentRoot extraFooterSpace={withCookie && theme === Theme.GRADIENT}>{!isLoading && children}</ContentRoot>
      {!isLoading && (
        <>
          {theme === Theme.WHITE && <Footer account={account} />}
          {!!systemMessage?.message && <SystemMessagePopup message={systemMessage.message} type={systemMessage.type} />}
          <CookiesFormRoot>
            <ContentWrapper>
              <CookiesForm theme={theme} onClose={() => setWithCookie(false)} />
            </ContentWrapper>
          </CookiesFormRoot>
        </>
      )}
    </WhiteRoot>
  );
};
