import React from 'react';
import { Asset, MergeFormValues, MergeStatus, sum, toBaseUnits } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';

interface MergeProgressProps {
  theme: Theme;
  asset: Asset;
  assetPrice: bigint;
  form: MergeFormValues;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const MergeProgress: React.FunctionComponent<MergeProgressProps> = ({
  theme,
  asset,
  assetPrice,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { toMerge, fee, submit, status } = form;
  const newSpendableBalance = sum(toMerge.value) - toBaseUnits(fee.value, asset.decimals);

  const items = [
    {
      title: 'New Sendable Balance',
      content: <AssetInfoRow asset={asset} value={newSpendableBalance} price={assetPrice} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={toBaseUnits(fee.value, asset.decimals)} price={assetPrice} />,
    },
  ];

  const steps = [
    {
      status: MergeStatus.CREATE_PROOF,
      text: 'Create Proof',
    },
    {
      status: MergeStatus.SEND_PROOF,
      text: 'Send Private Transaction',
    },
  ];

  return (
    <ProgressTemplate
      theme={theme}
      action="Merge"
      items={items}
      steps={steps}
      form={form as any}
      currentStatus={status.value}
      confirmStatus={MergeStatus.CONFIRM}
      validateStatus={MergeStatus.VALIDATE}
      doneStatus={MergeStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
