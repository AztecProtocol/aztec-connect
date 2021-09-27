import React, { useEffect } from 'react';
import styled, { css } from 'styled-components';
import closeIcon from '../images/close.svg';
import closeIconWhite from '../images/close_white.svg';
import { borderRadiuses, breakpoints, colours, defaultTextColour, gradients, spacings, Theme } from '../styles';
import { Overlay } from './overlay';
import { PaddedBlock } from './padded_block';
import { ContentWrapper } from './template/content_wrapper';
import { Text } from './text';

const ModalContentWrapper = styled(ContentWrapper)`
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
}

const PopupContent = styled(PaddedBlock)<PopupContentProps>`
  ${({ theme }) => (theme === Theme.WHITE ? whiteContent : gradientContent)};
  padding: ${spacings.m} ${spacings.xl};
  box-shadow: 0px 4px 50px rgba(0, 0, 0, 0.2);
  border-radius: ${borderRadiuses.m};
  max-height: calc(100vh - ${parseInt(spacings.m) * 2}px);
  overflow: auto;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.m} ${spacings.l};
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

interface ModalProps {
  theme?: Theme;
  title: string | React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

export const Modal: React.FunctionComponent<ModalProps> = ({ theme = Theme.WHITE, title, children, onClose }) => {
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
      <ModalContentWrapper>
        <PopupContent theme={theme}>
          {!!(title || onClose) && (
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
          )}
          {children}
        </PopupContent>
      </ModalContentWrapper>
    </Overlay>
  );
};
