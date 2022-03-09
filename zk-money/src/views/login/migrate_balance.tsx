import { getAssetIconWhite } from 'alt-model/known_assets/known_asset_display_data';
import { useRemoteAssetForId } from 'alt-model/top_level_context';
import React from 'react';
import styled from 'styled-components/macro';
import { MigratingAsset } from '../../app';
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

function ActiveAssetItem({ activeAsset }: { activeAsset: MigratingAsset }) {
  const remoteAsset = useRemoteAssetForId(activeAsset.assetId);
  if (!remoteAsset) return <></>;
  return (
    <ContentRoot>
      <MovingBubble icon={getAssetIconWhite(remoteAsset.address)} />
    </ContentRoot>
  );
}

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
      {!!activeAsset && <ActiveAssetItem activeAsset={activeAsset} />}
    </Root>
  );
};
