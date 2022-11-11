import React, { useLayoutEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { debounce } from 'lodash';
import { ContentWrapper } from './content_wrapper.js';
import { Footer } from './footer.js';
import { isSafari } from '../../device_support.js';
import { Pages } from '../../views/views.js';
import { Theme } from '../../ui-components/index.js';
import { colours, gradients } from '../../ui-components/styles/colour.js';

export * from './content_wrapper.js';

interface RootProps {
  theme: Theme;
}

interface BackgroundProps {
  theme: Theme;
  isResizing: boolean;
  isSafari: boolean;
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
  transition: transform ${({ isResizing, isSafari }) => (isResizing || isSafari ? '0s' : '1.25s')} ease;
  position: fixed;
  width: 300vw;
  height: 300vh;
  top: 0;
  left: 0;
  z-index: -999999;
`;
interface ContentRootProps {
  fullWidth: boolean;
}

const ContentRoot = styled(ContentWrapper)<ContentRootProps>`
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  ${({ fullWidth }) => fullWidth && 'width: 100%; max-width: initial;'}
`;

interface TemplateProps {
  theme: Theme;
  children: React.ReactNode;
  isLoading?: boolean;
  explorerUrl: string;
}

export const Template: React.FunctionComponent<TemplateProps> = ({
  theme,
  children,
  isLoading = false,
  explorerUrl,
}) => {
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

  const fullWidth = window.location.pathname === Pages.HOME;

  return (
    <>
      <Root theme={theme}>
        <ContentRoot fullWidth={fullWidth}>{children}</ContentRoot>
        <Footer explorerUrl={explorerUrl} />
      </Root>
      <Background isResizing={isResizing} theme={theme} isSafari={isSafari} />
    </>
  );
};
