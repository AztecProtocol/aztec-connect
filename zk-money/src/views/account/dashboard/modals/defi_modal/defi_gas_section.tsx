import type { Amount } from 'alt-model/assets';
import type { DefiRecipe } from 'alt-model/defi/types';
import { BridgeId, DefiSettlementTime } from '@aztec/sdk';
import { VerticalRadioButtons, RadioButtonOption } from 'ui-components';
import { InputSection } from '../sections/input_section';
import { MiniL2BalanceIndicator } from '../sections/amount_section/mini_balance_indicators';
import { SectionInfo } from '../modal_molecules/section_info';
import { DefiGasSaving } from './defi_gas_saving';
import { useRollupProviderStatus } from 'alt-model';
import { estimateDefiSettlementTimes } from 'alt-model/estimate_settlement_times';
import { FeeOptionContent } from '../sections/gas_section/fee_option_content';

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
    case DefiSettlementTime.NEXT_ROLLUP:
      return <p>Fast. Settle in the next Aztec rollup.</p>;
    case DefiSettlementTime.INSTANT:
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

  const options: RadioButtonOption<DefiSettlementTime>[] = [];

  if (batchSettlementTime && nextSettlementTime && batchSettlementTime.getTime() === nextSettlementTime.getTime()) {
    options.push({
      id: DefiSettlementTime.DEADLINE,
      content: (
        <FeeOptionContent
          label="Batched"
          expectedTimeOfSettlement={nextSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.DEADLINE]}
        />
      ),
    });
  } else {
    options.push({
      id: DefiSettlementTime.DEADLINE,
      content: (
        <FeeOptionContent
          label="Batched"
          expectedTimeOfSettlement={batchSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.DEADLINE]}
        />
      ),
    });
    options.push({
      id: DefiSettlementTime.NEXT_ROLLUP,
      content: (
        <FeeOptionContent
          label="Fast Track"
          expectedTimeOfSettlement={nextSettlementTime}
          feeAmount={feeAmounts?.[DefiSettlementTime.NEXT_ROLLUP]}
        />
      ),
    });
  }

  options.push({
    id: DefiSettlementTime.INSTANT,
    content: (
      <FeeOptionContent
        label="Instant"
        expectedTimeOfSettlement={instantSettlementTime}
        feeAmount={feeAmounts?.[DefiSettlementTime.INSTANT]}
      />
    ),
  });

  return (
    <InputSection
      title="Transaction Fee"
      titleComponent={<MiniL2BalanceIndicator asset={feeAmounts?.[0]?.info} />}
      component={
        <>
          <VerticalRadioButtons value={speed} onChangeValue={onChangeSpeed} options={options} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
