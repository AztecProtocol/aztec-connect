import React, { useEffect } from 'react';
import styled, { css } from 'styled-components/macro';
import closeIcon from '../images/close.svg';
import closeIconWhite from '../images/close_white.svg';
import { borderRadiuses, breakpoints, colours, defaultTextColour, gradients, spacings, Theme } from '../styles';
import { Overlay } from './overlay';
import { PaddedBlock } from './padded_block';
import { ContentWrapper } from './template/content_wrapper';
import { Text } from './text';

interface ModalContentWrapperProps {
  noPadding?: boolean;
}

const ModalContentWrapper = styled(ContentWrapper)<ModalContentWrapperProps>`
  ${({ noPadding }) => noPadding && `padding: 0;`}

  @media (max-width: ${breakpoints.s}) {
    padding: 0;
  }
`;

const gradientContent = css`
  background: linear-gradient(101.14deg, ${gradients.primary.from} 11.12%, ${gradients.primary.to} 58.22%);
  color: ${colours.white};
`;

const whiteContent = css`
  background: ${colours.white};
  color: ${defaultTextColour};
`;

interface PopupContentProps {
  theme: Theme;
  noPadding?: boolean;
}

const PopupContent = styled(PaddedBlock)<PopupContentProps>`
  ${({ theme }) => (theme === Theme.WHITE ? whiteContent : gradientContent)};
  padding: ${({ noPadding }) => (noPadding ? '0' : `${spacings.m} ${spacings.xl}`)};

  box-shadow: 0px 4px 50px rgba(0, 0, 0, 0.2);
  border-radius: ${borderRadiuses.m};
  max-height: calc(100vh - ${parseInt(spacings.m) * 2}px);
  overflow: auto;
  // Hack to prevent corner overflow on safari: https://stackoverflow.com/a/58283449
  transform: translateZ(0);

  @media (max-width: ${breakpoints.s}) {
    ${({ noPadding }) => !noPadding && `padding: ${spacings.m} ${spacings.l};`}
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
    height: fill-available;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
`;

const TitleRoot = styled.div`
  flex: 1;
  padding-right: ${spacings.s};
`;

const Title = styled(Text)`
  display: inline-block;
`;

const CloseButton = styled.div`
  flex-shrink: 0;
  padding: ${spacings.xs};
  cursor: pointer;
`;

interface ModalHeaderProps {
  theme?: Theme;
  title?: string | React.ReactNode;
  onClose?: () => void;
}

export const ModalHeader: React.FunctionComponent<ModalHeaderProps> = ({ theme, title, onClose }) => (
  <Header>
    {!!title && (
      <TitleRoot>
        <Title color={theme === Theme.WHITE ? 'gradient' : 'white'} size="xl">
          {title}
        </Title>
      </TitleRoot>
    )}
    {!!onClose && (
      <CloseButton onClick={onClose}>
        <img src={theme === Theme.GRADIENT ? closeIconWhite : closeIcon} alt="close" width={40} />
      </CloseButton>
    )}
  </Header>
);

interface ModalProps extends ModalHeaderProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const Modal: React.FunctionComponent<ModalProps> = ({
  theme = Theme.WHITE,
  title,
  children,
  onClose,
  noPadding,
}) => {
  useEffect(() => {
    const prevPosition = document.body.style.position;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '0px';

    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <Overlay>
      <ModalContentWrapper noPadding={noPadding}>
        <PopupContent theme={theme} noPadding={noPadding}>
          {!!(title || onClose) && <ModalHeader theme={theme} title={title} onClose={onClose} />}
          {children}
        </PopupContent>
      </ModalContentWrapper>
    </Overlay>
  );
};
