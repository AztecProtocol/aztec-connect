import { RemoteAsset } from 'alt-model/types';
import styled from 'styled-components/macro';
import { useAssetUnitPrice } from 'alt-model';
import { formatValueAsBulkPrice, fromBaseUnits } from 'app';
import { ShieldedAssetIcon, Text } from 'components';
import { spacings } from 'styles';

const Table = styled.div`
  padding: ${spacings.l} ${spacings.m};
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px 20px;
  align-items: center;
`;

interface RowProps {
  label: string;
  value: bigint;
  asset: RemoteAsset;
  assetUnitPrice: bigint;
}

function Row({ asset, value, label, assetUnitPrice }: RowProps) {
  return (
    <>
      <Text text={label} />
      <Text color="grey" size="s" text={`$${formatValueAsBulkPrice(value, asset.decimals, assetUnitPrice)}`} />
      <ShieldedAssetIcon size="s" address={asset.address} />
      <Text size="s" weight="bold" italic text={`${fromBaseUnits(value, asset.decimals)} ${asset.symbol}`} />
    </>
  );
}

interface BreakdownProps {
  asset: RemoteAsset;
  amount: bigint;
  fee: bigint;
}

export function Breakdown({ asset, amount, fee }: BreakdownProps) {
  const assetUnitPrice = useAssetUnitPrice(asset.id);

  return (
    <Table>
      <Row label="Amount" value={amount} asset={asset} assetUnitPrice={assetUnitPrice ?? 0n} />
      <Row label="Gas Fee" value={fee} asset={asset} assetUnitPrice={assetUnitPrice ?? 0n} />
      <Row label="Total Cost" value={amount + fee} asset={asset} assetUnitPrice={assetUnitPrice ?? 0n} />
    </Table>
  );
}
