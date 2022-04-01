import React, { useLayoutEffect, useState } from 'react';
import styled from 'styled-components/macro';
import { SystemMessage } from '../../app';
import { breakpoints, colours, gradients, spacings, Theme } from '../../styles';
import { CookiesForm, isCookieAccepted } from '../cookies_form';
import { SystemMessagePopup } from './system_message_popup';
import { ContentWrapper } from './content_wrapper';
import { Footer } from './footer';
import { debounce } from 'lodash';

export * from './content_wrapper';
export * from './system_message_popup';

interface RootProps {
  theme: Theme;
}

interface BackgroundProps {
  theme: Theme;
  isResizing: boolean;
}

const Root = styled.div<RootProps>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
  color: ${({ theme }) => (theme === Theme.GRADIENT ? `${colours.white}` : `${colours.black}`)};
`;

const Background = styled.div<BackgroundProps>`
  background: linear-gradient(
    101.14deg,
    white 0%,
    white 33.333%,
    ${gradients.primary.from} 66.666%,
    ${gradients.primary.from} 69%,
    ${gradients.primary.to} 82%
  );
  transform: ${({ theme }) =>
    theme === Theme.GRADIENT ? `translate(calc(-100% + 100vw), calc(-100% + 100vh))` : `translate(0%, 0%)`};
  transition: transform ${({ isResizing }) => (isResizing ? '0s' : '1.25s')} ease;
  position: fixed;
  width: 300vw;
  height: 300vh;
  top: 0;
  left: 0;
  z-index: -999999;
`;

interface ContentRootProps {
  extraFooterSpace: boolean;
}

const ContentRoot = styled(ContentWrapper)<ContentRootProps>`
  ${({ extraFooterSpace }) => extraFooterSpace && 'padding-bottom: 160px;'}
  min-height: 100vh;
  display: flex;
  flex-direction: column;

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
  systemMessage?: SystemMessage;
  isLoading?: boolean;
}

export const Template: React.FunctionComponent<TemplateProps> = ({
  theme,
  children,
  systemMessage,
  isLoading = false,
}) => {
  const [withCookie, setWithCookie] = useState(!isCookieAccepted());
  const [isResizing, setResizing] = useState(false);

  useLayoutEffect(() => {
    const stopResizing = debounce(() => {
      setResizing(false);
    }, 100);
    const resize = () => {
      setResizing(true);
      stopResizing();
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <>
      <Root theme={theme}>
        <ContentRoot extraFooterSpace={withCookie && theme === Theme.GRADIENT}>{!isLoading && children}</ContentRoot>
        {!isLoading && (
          <>
            {theme === Theme.WHITE && <Footer />}
            {!!systemMessage?.message && (
              <SystemMessagePopup message={systemMessage.message} type={systemMessage.type} />
            )}
            <CookiesFormRoot>
              <ContentWrapper>
                <CookiesForm theme={theme} onClose={() => setWithCookie(false)} />
              </ContentWrapper>
            </CookiesFormRoot>
          </>
        )}
      </Root>
      <Background isResizing={isResizing} theme={theme} />
    </>
  );
};
