import { CardTag } from './card_tag';
import { ShieldedAssetIcon } from '../shielded_asset_icon';
import styled from 'styled-components/macro';
import { RemoteAsset } from 'alt-model/types';

const Content = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export function CardAssetTag({ asset }: { asset: RemoteAsset }) {
  return (
    <CardTag>
      <Content>
        <ShieldedAssetIcon white size={18} address={asset.address} />
        zk{asset.symbol}
      </Content>
    </CardTag>
  );
}
