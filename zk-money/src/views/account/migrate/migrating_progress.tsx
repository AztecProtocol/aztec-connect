import React from 'react';
import styled from 'styled-components';
import { assets, MigratingAsset } from '../../../app';
import { MigratingAssetInfo, MovingBubble, PaddedBlock, Text, TextButton } from '../../../components';
import checkIcon from '../../../images/check.svg';
import warningIcon from '../../../images/exclamation_mark.svg';
import { gradients, spacings, systemStates } from '../../../styles';

const AssetsRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const LoaderRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const FeedbackRoot = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: ${spacings.m};
`;

interface FeedbackIconProps {
  type: 'warning' | 'success';
}

const FeedbackIconRoot = styled.div<FeedbackIconProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 64px;
  height: 64px;
  border-radius: 100%;
  user-select: none;
  background: ${({ type }) =>
    type === 'warning'
      ? systemStates.error
      : `linear-gradient(134.14deg, ${gradients.secondary.from} 18.37%, ${gradients.secondary.to} 82.04%)`};
`;

const FeedbackIcon = styled.img`
  height: 32px;
`;

const FeedbackMessage = styled(Text)`
  padding: ${spacings.xs} 0;
  text-align: center;
`;

const FeedbackTitle = styled(FeedbackMessage)`
  padding: ${spacings.s} 0;
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
      {!activeAsset && !failed && (
        <FeedbackRoot>
          <FeedbackIconRoot type="success">
            <FeedbackIcon src={checkIcon} />
          </FeedbackIconRoot>
          <FeedbackTitle text="Migrated!" size="xl" />
          <TextButton text="(Close Window)" size="xs" onClick={onClose} />
        </FeedbackRoot>
      )}
      {failed && (
        <FeedbackRoot>
          <FeedbackIconRoot type="warning">
            <FeedbackIcon src={warningIcon} />
          </FeedbackIconRoot>
          <FeedbackTitle text="Something went wrong. Please try again later." size="s" />
          <TextButton text="(Close Window)" size="xs" onClick={onClose} />
        </FeedbackRoot>
      )}
    </>
  );
};
