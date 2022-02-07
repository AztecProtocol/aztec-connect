import React from 'react';
import styled from 'styled-components/macro';
import { CloseButton } from '../icon_buttons';

const Root = styled.div`
  position: relative;
`;

const InfoLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(15px);
  overflow: auto;
`;

const InfoCloseButton = styled(CloseButton)`
  position: absolute;
  right: 20px;
  top: 20px;
`;

interface InfoLayerProps {
  children: React.ReactNode;
  showingInfo: boolean;
  infoContent: React.ReactNode;
  onHideInfo: () => void;
}

export function InfoWrap({ children, showingInfo, infoContent, onHideInfo }: InfoLayerProps) {
  return (
    <Root>
      {children}
      {showingInfo && (
        <>
          <InfoLayer>{infoContent}</InfoLayer>
          <InfoCloseButton onClick={onHideInfo} />
        </>
      )}
    </Root>
  );
}
