import type { RemoteAsset } from 'alt-model/types';
import { AmountSelection } from 'ui-components';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from './mini_balance_indicators';
import { InputAnnotation } from './types';
import { InputSection } from '../input_section';

type BalanceType = 'L1' | 'L2';

function renderBalanceIndicator(balanceType: BalanceType, asset: RemoteAsset) {
  switch (balanceType) {
    case 'L1':
      return <MiniL1BalanceIndicator asset={asset} />;
    case 'L2':
      return <MiniL2BalanceIndicator asset={asset} />;
  }
}

interface AmountSectionProps {
  asset: RemoteAsset;
  amountStr: string;
  maxAmount: bigint;
  onChangeAmountStr: (amountStr: string) => void;
  onChangeAsset?: (option: number) => void;
  allowAssetSelection?: boolean;
  amountStrAnnotation?: InputAnnotation;
  hidePrivacy?: boolean;
  message?: string;
  balance?: boolean;
  assets?: RemoteAsset[];
  balanceType: BalanceType;
}

export function AmountSection(props: AmountSectionProps) {
  return (
    <InputSection
      title={'Amount'}
      titleComponent={renderBalanceIndicator(props.balanceType, props.asset)}
      component={
        <AmountSelection
          asset={props.asset}
          assets={props.assets}
          allowAssetSelection={props.allowAssetSelection}
          maxAmount={props.maxAmount}
          onChangeAmountString={props.onChangeAmountStr}
          onChangeAsset={props.onChangeAsset}
          amountString={props.amountStr}
        />
      }
      errorMessage={props.message}
    />
  );
}
