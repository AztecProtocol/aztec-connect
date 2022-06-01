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
  max-width: 950px;
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
  className?: string;
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

  const { onClose } = props;
  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <Overlay>
      <ModalWrapper className={props.className}>{props.children}</ModalWrapper>
    </Overlay>
  );
};
