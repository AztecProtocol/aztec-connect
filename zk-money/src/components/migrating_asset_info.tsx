import { getAssetIconWhite } from 'alt-model/known_assets/known_asset_display_data';
import { useRemoteAssetForId } from 'alt-model/top_level_context';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components/macro';
import { fromBaseUnits, MigratingAsset, sum } from '../app';
import { colours, spacings } from '../styles';
import { Text } from './text';

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.s} 0;
  width: 100%;
`;

const InfoRoot = styled.div`
  display: flex;
  align-items: center;
`;

const AssetIconRoot = styled.div`
  display: flex;
  justify-content: center;
  width: 20px;
  padding-right: ${spacings.m};
`;

const AssetIcon = styled.img`
  padding: 0 ${spacings.s};
  height: 20px;
`;

interface BalanceRootProps {
  dim?: boolean;
}

const BalanceRoot = styled.div<BalanceRootProps>`
  display: flex;
  align-items: center;
  ${({ dim }) => (dim ? 'opacity: 0.5;' : '')}
`;

const FeeRoot = styled.div`
  padding-left: ${spacings.s};
`;

const DotDotDot = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.m};
`;

const Dot = styled.div`
  display: block;
  margin: 0 ${spacings.xxs};
  width: 4px;
  height: 4px;
  background: ${rgba(colours.white, 0.5)};
  border-radius: 100%100%;
`;

interface MigratingAssetInfoProps {
  asset: MigratingAsset;
  showMigrated?: boolean;
}

export const MigratingAssetInfo: React.FunctionComponent<MigratingAssetInfoProps> = ({
  asset,
  showMigrated = false,
}) => {
  const remoteAsset = useRemoteAssetForId(asset.assetId);
  if (!remoteAsset) return <></>;
  const { migratableValues, migratedValues, totalFee } = asset;
  const oldBalance = sum(migratableValues);
  const remainingBalance = sum(migratableValues.slice(migratedValues.length * 2));
  const migratedBalance = sum(migratedValues);
  const { symbol, decimals } = remoteAsset;
  return (
    <Root>
      <InfoRoot>
        <AssetIconRoot>
          <AssetIcon src={getAssetIconWhite(remoteAsset.address)} />
        </AssetIconRoot>
        <BalanceRoot dim={showMigrated && !remainingBalance}>
          <Text text={fromBaseUnits(oldBalance, decimals)} monospace />
          <Text text={` ${symbol}`} />
          {!!oldBalance && (
            <FeeRoot>
              <Text text={`(fee: ${fromBaseUnits(totalFee, decimals)})`} size="s" />
            </FeeRoot>
          )}
        </BalanceRoot>
      </InfoRoot>
      {showMigrated && (
        <InfoRoot>
          <DotDotDot>
            <Dot />
            <Dot />
            <Dot />
          </DotDotDot>
          <BalanceRoot>
            <Text text={fromBaseUnits(migratedBalance, decimals)} monospace />
            <Text text={` ${symbol}`} />
          </BalanceRoot>
        </InfoRoot>
      )}
    </Root>
  );
};
