import React from 'react';
import styled from 'styled-components/macro';
import { MigratingAsset } from '../../../app';
import { Button, MigratingAssetInfo, PaddedBlock, Text, TextLink } from '../../../components';

const AssetsRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const ButtonRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

interface AssetBalancesFormProps {
  migratingAssets: MigratingAsset[];
  migratable: boolean;
  submitting: boolean;
  onSubmit(): void;
  onClose(): void;
}

export const AssetBalancesForm: React.FunctionComponent<AssetBalancesFormProps> = ({
  migratingAssets,
  migratable,
  submitting,
  onSubmit,
  onClose,
}) => (
  <>
    <AssetsRoot>
      {migratingAssets.map(asset => (
        <MigratingAssetInfo key={asset.assetId} asset={asset} />
      ))}
    </AssetsRoot>
    {migratable && (
      <>
        <ButtonRoot size="m">
          <Button theme="white" text="Migrate" onClick={onSubmit} />
        </ButtonRoot>
        <Text size="xxs">
          {'By clicking Migrate, you agree to the '}
          <TextLink text="Terms and Conditions" color="white" target="_blank" href="" underline inline />
          {'.'}
        </Text>
      </>
    )}
    {!migratable && (
      <ButtonRoot size="m">
        <Button theme="white" text="Close" onClick={onClose} isLoading={submitting} />
      </ButtonRoot>
    )}
  </>
);
