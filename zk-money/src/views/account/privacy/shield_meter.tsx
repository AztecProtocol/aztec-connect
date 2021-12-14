import React from 'react';
import styled from 'styled-components';
import { ShieldedAssetIcon, IconVarients } from '../../../components';
import zkShieldBlack from '../../../images/zk_shield_black.svg';

const Root = styled.div`
  position: relative;
  width: fit-content;
  height: fit-content;
`;

const BlackFill = styled.div<{ t: number; hide: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: url(${zkShieldBlack});
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  transition: clip-path 0.2s, opacity 0.2s;
  clip-path: inset(0 0 ${({ t }) => t * 100}% 0);
  opacity: ${({ hide }) => (hide ? 0 : 1)};
`;

interface ShieldMeterProps {
  score: number;
  asset: IconVarients;
}

export const ShieldMeter: React.FunctionComponent<ShieldMeterProps> = ({ score, asset }) => {
  const hideShield = score === 0;
  return (
    <Root>
      <ShieldedAssetIcon asset={asset} size="xxl" white hideShield={hideShield} />
      <BlackFill t={score} hide={hideShield} />
    </Root>
  );
};
