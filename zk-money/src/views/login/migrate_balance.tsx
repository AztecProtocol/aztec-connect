import React from 'react';
import styled from 'styled-components/macro';
import { assets, MigratingAsset } from '../../app';
import { Button, MigratingAssetInfo, MovingBubble, PaddedBlock } from '../../components';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const ContentRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
  width: 100%;
`;

interface MigrateBalanceProps {
  migratingAssets: MigratingAsset[];
  activeAsset?: MigratingAsset;
  onMigrateNotes?: () => void;
}

export const MigrateBalance: React.FunctionComponent<MigrateBalanceProps> = ({
  migratingAssets,
  activeAsset,
  onMigrateNotes,
}) => {
  return (
    <Root>
      {migratingAssets.map(asset => (
        <MigratingAssetInfo
          key={asset.assetId}
          asset={asset}
          showMigrated={activeAsset && asset.assetId <= activeAsset.assetId}
        />
      ))}
      {!!onMigrateNotes && (
        <ContentRoot>
          <Button theme="white" text="Migrate" onClick={onMigrateNotes} />
        </ContentRoot>
      )}
      {!!activeAsset && (
        <ContentRoot>
          <MovingBubble icon={assets[activeAsset.assetId].iconWhite} />
        </ContentRoot>
      )}
    </Root>
  );
};
