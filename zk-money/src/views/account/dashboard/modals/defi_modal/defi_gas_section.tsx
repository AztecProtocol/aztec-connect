import type { Amount } from 'alt-model/assets';
import type { DefiRecipe } from 'alt-model/defi/types';
import { DefiSettlementTime } from '@aztec/sdk';
import { SpeedSwitch } from 'ui-components';
import { InputSection } from '../sections/input_section';
import { MiniL2BalanceIndicator } from '../sections/amount_section/mini_balance_indicators';
import { FeeBulkPriceSubLabel } from '../sections/gas_section/fee_bulk_price_sub_label';
import { SectionInfo } from '../modal_molecules/section_info';
import { DefiGasSaving } from './defi_gas_saving';

function renderInfo(props: DefiGasSectionProps) {
  const selectedFeeAmount = props.feeAmounts?.[props.speed];
  switch (props.speed) {
    case DefiSettlementTime.DEADLINE:
      return (
        <>
          <p>
            Transaction will be rolled into the next batch. A batch is included in the next rollup when all its slots
            are full.
          </p>
          <DefiGasSaving feeAmount={selectedFeeAmount} bridgeAddressId={props.recipe?.addressId} />
        </>
      );
    case DefiSettlementTime.INSTANT:
      return (
        <>
          <p>All remaining slots will be filled & the batch will be included in the next rollup!</p>
          <p>You’re getting fast settlement & privacy🎉</p>
        </>
      );
    case DefiSettlementTime.NEXT_ROLLUP:
      return (
        <>
          <p>
            All remaining slots will be filled & the batch will be included in the next rollup, whilst also kicking the
            rollup off ahead of schedule.
          </p>
          <p>You’re getting fast settlement & privacy 😊</p>
        </>
      );
  }
}

interface DefiGasSectionProps {
  speed: DefiSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  recipe: DefiRecipe;
}

export function DefiGasSection(props: DefiGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts } = props;

  const options = [
    {
      value: DefiSettlementTime.DEADLINE,
      label: 'Batched',
      sublabel: <FeeBulkPriceSubLabel feeAmount={feeAmounts?.[DefiSettlementTime.DEADLINE]} />,
    },
    {
      value: DefiSettlementTime.NEXT_ROLLUP,
      label: 'Fast Track',
      sublabel: <FeeBulkPriceSubLabel feeAmount={feeAmounts?.[DefiSettlementTime.NEXT_ROLLUP]} />,
    },
    {
      value: DefiSettlementTime.INSTANT,
      label: 'ASAP',
      sublabel: <FeeBulkPriceSubLabel feeAmount={feeAmounts?.[DefiSettlementTime.INSTANT]} />,
    },
  ];

  return (
    <InputSection
      title={'Gas Fee'}
      titleComponent={<MiniL2BalanceIndicator asset={feeAmounts?.[0]?.info} />}
      component={
        <>
          <SpeedSwitch value={speed} onChangeValue={onChangeSpeed} options={options} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
