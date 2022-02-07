import React, { useState } from 'react';
import { Navbar } from 'ui-components';
import styled, { css } from 'styled-components/macro';
import { AccountState, SystemMessage, WorldState } from '../../app';
import { breakpoints, colours, gradients, spacings, Theme } from '../../styles';
import { CookiesForm, isCookieAccepted } from '../cookies_form';
import { SystemMessagePopup } from './system_message_popup';
import { ContentWrapper } from './content_wrapper';
import { Footer } from './footer';

export * from './content_wrapper';
export * from './section';
export * from './system_message_popup';

const rootStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
`;

const GradientRoot = styled.div`
  ${rootStyle};
  background: linear-gradient(101.14deg, ${gradients.primary.from} 11.12%, ${gradients.primary.to} 58.22%);
  color: ${colours.white};
`;

const WhiteRoot = styled.div`
  ${rootStyle};
  background: ${colours.white};
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
  network?: string;
  worldState?: WorldState;
  account?: AccountState;
  rootUrl?: string;
  systemMessage?: SystemMessage;
  onMigrateOldBalance?: () => void;
  onMigrateForgottonBalance?: () => void;
  onLogout?: () => void;
  isLoading?: boolean;
}

export const Template: React.FunctionComponent<TemplateProps> = ({
  theme,
  children,
  network,
  worldState,
  account,
  rootUrl = '/',
  systemMessage,
  onMigrateOldBalance,
  onMigrateForgottonBalance,
  onLogout,
  isLoading = false,
}) => {
  const [withCookie, setWithCookie] = useState(!isCookieAccepted());
  const TemplateRoot = theme === Theme.GRADIENT ? GradientRoot : WhiteRoot;

  return (
    <TemplateRoot>
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
    </TemplateRoot>
  );
};
