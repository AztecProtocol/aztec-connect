import { CardTag } from './card_tag';
import { assets } from '../../app';
import { ShieldedAssetIcon } from '../shielded_asset_icon';
import styled from 'styled-components/macro';

const Content = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export function CardAssetTag(props: { assetId: number }) {
  const asset = assets[props.assetId];
  return (
    <CardTag motif="frost">
      <Content>
        <ShieldedAssetIcon white size={18} asset={asset} />
        zk{asset.symbol}
      </Content>
    </CardTag>
  );
}
