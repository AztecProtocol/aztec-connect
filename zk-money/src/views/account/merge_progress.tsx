import React from 'react';
import { fromBaseUnits, MergeForm, MergeStatus, sum, toBaseUnits } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';

interface MergeProgressProps {
  theme: Theme;
  form: MergeForm;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const MergeProgress: React.FunctionComponent<MergeProgressProps> = ({
  theme,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { toMerge, fee, submit, status } = form;
  const asset = form.asset.value;
  const newSpendableBalance = sum(toMerge.value) - toBaseUnits(fee.value, asset.decimals);

  const items = [
    {
      title: 'New Sendable Balance',
      content: <AssetInfoRow asset={asset} value={fromBaseUnits(newSpendableBalance, asset.decimals)} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={fee.value} />,
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
      form={form}
      currentStatus={status.value}
      confirmStatus={MergeStatus.CONFIRM}
      doneStatus={MergeStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
