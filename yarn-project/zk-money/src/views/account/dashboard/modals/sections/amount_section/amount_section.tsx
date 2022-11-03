import type { RemoteAsset } from '../../../../../../alt-model/types.js';
import type { StrOrMax } from '../../../../../../alt-model/forms/constants.js';
import { AmountSelection } from '../../../../../../components/index.js';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from './mini_balance_indicators.js';
import { InputAnnotation } from './types.js';
import { InputSection } from '../input_section/index.js';

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
  amountStrOrMax: StrOrMax;
  maxAmount: bigint;
  onChangeAmountStrOrMax: (amountStrOrMax: StrOrMax) => void;
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
          onChangeAmountStringOrMax={props.onChangeAmountStrOrMax}
          onChangeAsset={props.onChangeAsset}
          amountStringOrMax={props.amountStrOrMax}
        />
      }
      errorMessage={props.message}
    />
  );
}
