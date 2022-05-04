import type { Amount } from 'alt-model/assets';
import type { DefiRecipe } from 'alt-model/defi/types';
import { BridgeId, DefiSettlementTime } from '@aztec/sdk';
import { SpeedSwitch } from 'ui-components';
import { InputSection } from '../sections/input_section';
import { MiniL2BalanceIndicator } from '../sections/amount_section/mini_balance_indicators';
import { FeeBulkPriceSubLabel } from '../sections/gas_section/fee_bulk_price_sub_label';
import { SectionInfo } from '../modal_molecules/section_info';
import { DefiGasSaving } from './defi_gas_saving';
import { useRollupProviderStatus } from 'alt-model';
import { estimateDefiSettlementTimes } from 'alt-model/estimate_settlement_times';

function renderInfo(props: DefiGasSectionProps) {
  const selectedFeeAmount = props.feeAmounts?.[props.speed];
  switch (props.speed) {
    case DefiSettlementTime.DEADLINE:
      return (
        <>
          <p>Default speed. Split fees with others doing the same transaction.</p>
          <DefiGasSaving feeAmount={selectedFeeAmount} bridgeAddressId={props.recipe?.addressId} />
        </>
      );
    case DefiSettlementTime.INSTANT:
      return <p>Fast. Settle in the next Aztec rollup.</p>;
    case DefiSettlementTime.NEXT_ROLLUP:
      return <p>Fastest. Settle immediately on Ethereum.</p>;
  }
}

interface DefiGasSectionProps {
  speed: DefiSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  recipe: DefiRecipe;
  bridgeId?: BridgeId;
}

export function DefiGasSection(props: DefiGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts } = props;
  const rpStatus = useRollupProviderStatus();
  const bridgeIdNum = props.bridgeId?.toBigInt();
  const bridgeStatus = rpStatus?.bridgeStatus.find(x => x.bridgeId === bridgeIdNum);
  const { instantSettlementTime, nextSettlementTime, batchSettlementTime } = estimateDefiSettlementTimes(
    rpStatus,
    bridgeStatus,
  );

  const options = [
    {
      value: DefiSettlementTime.DEADLINE,
      label: 'Batched',
      sublabel: (
        <FeeBulkPriceSubLabel
          expectedTimeOfSettlement={batchSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.DEADLINE]}
        />
      ),
    },
    {
      value: DefiSettlementTime.NEXT_ROLLUP,
      label: 'Fast Track',
      sublabel: (
        <FeeBulkPriceSubLabel
          expectedTimeOfSettlement={nextSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.NEXT_ROLLUP]}
        />
      ),
    },
    {
      value: DefiSettlementTime.INSTANT,
      label: 'Instant',
      sublabel: (
        <FeeBulkPriceSubLabel
          expectedTimeOfSettlement={instantSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.INSTANT]}
        />
      ),
    },
  ];

  return (
    <InputSection
      title={'Gas Fee'}
      titleComponent={<MiniL2BalanceIndicator asset={feeAmounts?.[0]?.info} />}
      component={
        <>
          <SpeedSwitch value={speed} onChangeValue={onChangeSpeed} options={options} height={100} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
