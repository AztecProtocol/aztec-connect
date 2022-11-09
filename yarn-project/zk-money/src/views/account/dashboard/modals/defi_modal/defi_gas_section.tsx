import type { Amount } from '../../../../../alt-model/assets/index.js';
import type { DefiRecipe } from '../../../../../alt-model/defi/types.js';
import { BridgeCallData, DefiSettlementTime } from '@aztec/sdk';
import { VerticalRadioButtons, RadioButtonOption } from '../../../../../ui-components/index.js';
import { InputSection } from '../sections/input_section/index.js';
import { MiniL2BalanceIndicator } from '../sections/amount_section/mini_balance_indicators.js';
import { SectionInfo } from '../modal_molecules/section_info/index.js';
import { DefiGasSaving } from './defi_gas_saving.js';
import { useRollupProviderStatus } from '../../../../../alt-model/index.js';
import { estimateTxSettlementTimes } from '../../../../../alt-model/estimate_settlement_times.js';
import { FeeOptionContent } from '../sections/gas_section/fee_option_content/index.js';
import {
  useDefiBatchAverageTimeout,
  useDefiBatchData,
} from '../../../../../features/defi/bridge_count_down/bridge_count_down_hooks.js';

function renderInfo(props: DefiGasSectionProps) {
  const selectedFeeAmount = props.feeAmounts?.[props.speed];
  switch (props.speed) {
    case DefiSettlementTime.DEADLINE:
      return (
        <>
          <p>Default speed. Split fees with others doing the same transaction.</p>
          <DefiGasSaving feeAmount={selectedFeeAmount} bridgeAddressId={props.bridgeCallData?.bridgeAddressId} />
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
  bridgeCallData?: BridgeCallData;
}

export function DefiGasSection(props: DefiGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts } = props;
  const rpStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const batchData = useDefiBatchData(props.bridgeCallData);
  const batchAverageTimeout = useDefiBatchAverageTimeout(props.recipe, props.bridgeCallData);

  const options: RadioButtonOption<DefiSettlementTime>[] = [];

  if (batchData?.isFastTrack) {
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
          averageTimeoutSeconds={batchAverageTimeout}
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
