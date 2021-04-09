import React, { useEffect } from 'react';
import styled from 'styled-components';
import closeIcon from '../images/close.svg';
import { borderRadiuses, breakpoints, colours, spacings } from '../styles';
import { ContentWrapper } from './template/content_wrapper';
import { PaddedBlock } from './padded_block';
import { Text } from './text';
import { Overlay } from './overlay';

const ModalContentWrapper = styled(ContentWrapper)`
  @media (max-width: ${breakpoints.s}) {
    padding: 0;
  }
`;

const PopupContent = styled(PaddedBlock)`
  padding: ${spacings.m} ${spacings.xl};
  background: ${colours.white};
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
  title: string | React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

export const Modal: React.FunctionComponent<ModalProps> = ({ title, children, onClose }) => {
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
        <PopupContent>
          {!!(title || onClose) && (
            <Header>
              {!!title && (
                <TitleRoot>
                  <Title color="gradient" size="xl">
                    {title}
                  </Title>
                </TitleRoot>
              )}
              {!!onClose && (
                <CloseButton onClick={onClose}>
                  <img src={closeIcon} alt="close" width={40} />
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
