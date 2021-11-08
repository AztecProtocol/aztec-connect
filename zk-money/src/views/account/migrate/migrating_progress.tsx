import React from 'react';
import styled from 'styled-components';
import { assets, MigratingAsset } from '../../../app';
import { MigratingAssetInfo, MovingBubble, PaddedBlock } from '../../../components';
import { Feedback } from './feedback';

const AssetsRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const LoaderRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

interface MigratingProgressProps {
  migratingAssets: MigratingAsset[];
  activeAsset?: MigratingAsset;
  failed: boolean;
  onClose(): void;
}

export const MigratingProgress: React.FunctionComponent<MigratingProgressProps> = ({
  migratingAssets,
  activeAsset,
  failed,
  onClose,
}) => {
  return (
    <>
      <AssetsRoot>
        {migratingAssets.map(asset => (
          <MigratingAssetInfo
            key={asset.assetId}
            asset={asset}
            showMigrated={!activeAsset || asset.assetId <= activeAsset.assetId}
          />
        ))}
      </AssetsRoot>
      {activeAsset && !failed && (
        <LoaderRoot>
          <MovingBubble icon={assets[activeAsset.assetId].iconWhite} />
        </LoaderRoot>
      )}
      {!activeAsset && !failed && <Feedback title="Migrated!" onClose={onClose} />}
      {failed && <Feedback description="Something went wrong. Please try again later." onClose={onClose} failed />}
    </>
  );
};
