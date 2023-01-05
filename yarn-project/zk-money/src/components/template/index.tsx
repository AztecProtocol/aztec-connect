import React from 'react';
import { default as styled } from 'styled-components';
import { ContentWrapper } from './content_wrapper.js';
import { Footer } from './footer.js';
import { Pages } from '../../views/views.js';
import { Theme } from '../../ui-components/index.js';
import style from './index.module.scss';

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
  explorerUrl: string;
}

export const Template: React.FunctionComponent<TemplateProps> = ({ theme, children, explorerUrl }) => {
  const fullWidth = window.location.pathname === Pages.HOME;

  return (
    <div className={style.root}>
      <ContentRoot fullWidth={fullWidth}>{children}</ContentRoot>
      <Footer explorerUrl={explorerUrl} />
    </div>
  );
};

export * from './content_wrapper.js';
