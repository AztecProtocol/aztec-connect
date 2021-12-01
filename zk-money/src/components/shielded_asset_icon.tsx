import styled from 'styled-components';
import zkShieldGradientIcon from '../images/zk_shield_gradient.svg';
import zkShieldWhiteIcon from '../images/zk_shield_white.svg';
import { Size } from '../styles';

const iconSizes = {
  xxl: '72px',
  xl: '62px',
  l: '50px',
  m: '36px',
  s: '28px',
  xs: '24px',
  xxs: '22px',
};

const Root = styled.div<{ size: Size }>`
  position: relative;
  ${({ size }) => `
    width: ${iconSizes[size]};
    height: ${iconSizes[size]};
  `}
`;

interface IconVarients {
  iconWhite: string;
  iconGradient: string;
}

const unitSize = 100 / 248;

const AssetIcon = styled.div<{ white?: boolean; icons: IconVarients }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: top left;
  transform: translate(${61 * unitSize}%, ${70 * unitSize}%) scale(${116 * unitSize}%);
  background-image: url(${({ white, icons }) => (white ? icons.iconWhite : icons.iconGradient)});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
`;

const ShieldIcon = styled.div<{ white?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${({ white }) => (white ? zkShieldWhiteIcon : zkShieldGradientIcon)});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
`;

export const ShieldedAssetIcon: React.FunctionComponent<{
  asset: IconVarients;
  white?: boolean;
  size?: Size;
}> = ({ white, asset, size = 'm' }) => (
  <Root size={size}>
    <AssetIcon white={white} icons={asset} />
    <ShieldIcon white={white} />
  </Root>
);
