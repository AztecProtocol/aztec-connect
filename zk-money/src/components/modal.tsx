import React, { useEffect } from 'react';
import styled from 'styled-components/macro';
import closeIcon from '../images/close.svg';
import closeIconWhite from '../images/close_white.svg';
import { spacings, Theme } from '../styles';
import { Overlay } from './overlay';
import { Text } from './text';

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

const ModalWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 66vw;
  max-width: 900px;
  overflow-y: auto;
`;

interface ModalHeaderProps {
  theme?: Theme;
  title?: string | React.ReactNode;
  onClose?: () => void;
}

interface ModalProps extends ModalHeaderProps {
  children: React.ReactNode;
  noPadding?: boolean;
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

export const Modal: React.FunctionComponent<ModalProps> = props => {
  const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
    if (keyboardEvent.key === 'Escape') {
      props.onClose && props.onClose();
    }
  };

  useEffect(() => {
    const prevPosition = document.body.style.position;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '0px';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Overlay>
      <ModalWrapper>{props.children}</ModalWrapper>
    </Overlay>
  );
};
