import { formatCost } from 'app';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/sdk';
import { SpeedSwitch } from 'ui-components';
import { Text } from 'components';
import { useAmountCost } from 'alt-model';
import { DefiGasSavings } from './def_gas_savings';
import { Amount } from 'alt-model/assets';
import { DefiRecipe } from 'alt-model/defi/types';
import { RemoteAsset } from 'alt-model/types';
import { DefiRollupTiming } from './defi_rollup_timing';
import { InputSection } from '../input_section';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from '../amount_section/mini_balance_indicators';
import style from './gas_section.module.scss';

export enum GasSectionType {
  DEFI = 'DEFI',
  TX = 'TX',
}

type BalanceType = 'L1' | 'L2';

interface GasSectionProps {
  type: GasSectionType;
  speed: DefiSettlementTime | TxSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime | TxSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  recipe?: DefiRecipe;
  asset?: RemoteAsset;
  balanceType: BalanceType;
}

interface DefiOption {
  value: DefiSettlementTime;
  label: string;
  sublabel?: React.Component;
}

interface TxOption {
  value: TxSettlementTime;
  label: string;
  sublabel?: React.Component;
}

const DEFI_OPTIONS: DefiOption[] = [
  { value: DefiSettlementTime.DEADLINE, label: 'Batched' },
  { value: DefiSettlementTime.NEXT_ROLLUP, label: 'Fast Track' },
  { value: DefiSettlementTime.INSTANT, label: 'Instant' },
];

const TX_OPTIONS: TxOption[] = [
  { value: TxSettlementTime.INSTANT, label: 'Instant' },
  { value: TxSettlementTime.NEXT_ROLLUP, label: 'Next Rollup' },
];

const mapFeeSubLabel = (options: DefiOption[] | TxOption[], feeAmounts?: (Amount | undefined)[]) => {
  return options.map((option, i) =>
    feeAmounts ? { ...option, sublabel: <AmountDisplay feeAmount={feeAmounts[i]} /> } : option,
  );
};

function AmountDisplay({ feeAmount }: { feeAmount: Amount | undefined }) {
  const feeCost = useAmountCost(feeAmount);
  const feeCostStr = feeCost !== undefined ? `$${formatCost(feeCost)}` : undefined;
  return <div className={style.amountDisplay}>{feeCostStr}</div>;
}

function renderBalanceIndicator(balanceType: BalanceType, asset?: RemoteAsset) {
  switch (balanceType) {
    case 'L1':
      return <MiniL1BalanceIndicator asset={asset} />;
    case 'L2':
      return <MiniL2BalanceIndicator asset={asset} />;
  }
}

export function GasSection({ type, speed, onChangeSpeed, feeAmounts, recipe, asset, balanceType }: GasSectionProps) {
  let options: DefiOption[] | TxOption[] = DEFI_OPTIONS;
  if (type === GasSectionType.DEFI) {
    options = mapFeeSubLabel(DEFI_OPTIONS, feeAmounts) as DefiOption[];
  } else if (type === GasSectionType.TX) {
    options = mapFeeSubLabel(TX_OPTIONS, feeAmounts) as TxOption[];
  }

  const shouldShowDefiBatchingInfo =
    type === GasSectionType.DEFI && speed === DefiSettlementTime.DEADLINE && recipe !== undefined;

  return (
    <InputSection
      title={'Gas Fee'}
      titleComponent={renderBalanceIndicator(balanceType, asset)}
      component={
        <>
          <SpeedSwitch value={speed} onChangeValue={onChangeSpeed} options={options} />
          <div className={style.centeredText}>
            {shouldShowDefiBatchingInfo && (
              <Text size="xxs" color="grey">
                <DefiRollupTiming recipe={recipe} />
              </Text>
            )}
            {shouldShowDefiBatchingInfo && (
              <Text size="xxs">
                <DefiGasSavings feeAmount={undefined} bridgeAddressId={recipe.addressId} />
              </Text>
            )}
          </div>
        </>
      }
    />
  );
}
