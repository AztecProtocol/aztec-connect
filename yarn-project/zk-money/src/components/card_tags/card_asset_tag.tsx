import { CardTag } from './card_tag.js';
import { ShieldedAssetIcon } from '../shielded_asset_icon.js';
import { default as styled } from 'styled-components';
import { RemoteAsset } from '../../alt-model/types.js';

const Content = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export function CardAssetTag({ asset }: { asset: RemoteAsset }) {
  return (
    <CardTag>
      <Content>
        <ShieldedAssetIcon white size={18} asset={asset} />
        zk{asset.symbol}
      </Content>
    </CardTag>
  );
}
