import { default as styled } from 'styled-components';
import { getAssetIconGradient, getAssetIconWhite } from '../alt-model/known_assets/known_asset_display_data.js';
import { RemoteAsset } from '../alt-model/types.js';
import zkShieldGradientIcon from '../images/zk_shield_gradient.svg';
import zkShieldWhiteIcon from '../images/zk_shield_white.svg';
import { Size } from '../ui-components/styles/layout.js';

const iconSizes = {
  xxl: '92px',
  xl: '72px',
  l: '50px',
  m: '36px',
  s: '28px',
  xs: '24px',
  xxs: '22px',
};

const Root = styled.div<{ size: Size | number }>`
  position: relative;
  ${({ size }) => {
    const pxs = typeof size === 'number' ? `${size}px` : iconSizes[size];
    return `
    width: ${pxs};
    height: ${pxs};
    min-width: ${pxs};
  `;
  }}
`;

const unitSize = 100 / 248;

const AssetIcon = styled.div<{ icon: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: top left;
  transform: translate(${61 * unitSize}%, ${70 * unitSize}%) scale(${(116 * unitSize) / 100});
  background-image: url(${({ icon }) => icon});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
`;

const ShieldIcon = styled.div<{ white?: boolean; hide?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${({ white }) => (white ? zkShieldWhiteIcon : zkShieldGradientIcon)});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 0.2s;
  opacity: ${({ hide }) => (hide ? 0 : 1)};
`;

export const ShieldedAssetIcon: React.FunctionComponent<{
  asset: RemoteAsset;
  white?: boolean;
  size?: Size | number;
  hideShield?: boolean;
}> = ({ white, asset, size = 'm', hideShield }) => {
  const icon = white ? getAssetIconWhite(asset.label) : getAssetIconGradient(asset.label);
  return (
    <Root size={size} title={asset.name}>
      <AssetIcon icon={icon} />
      <ShieldIcon white={white} hide={hideShield} />
    </Root>
  );
};
