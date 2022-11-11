import moment from 'moment';
import { BridgeCallData, DefiSettlementTime } from '@aztec/sdk';
import type { Amount } from '../../../../../alt-model/assets/index.js';
import type { DefiRecipe } from '../../../../../alt-model/defi/types.js';
import { useAmountBulkPrice, useRollupProviderStatus } from '../../../../../alt-model/index.js';
import { estimateTxSettlementTimes } from '../../../../../alt-model/estimate_settlement_times.js';
import {
  useDefiBatchAverageTimeout,
  useDefiBatchData,
} from '../../../../../features/defi/bridge_count_down/bridge_count_down_hooks.js';
import { useWalletInteractionIsOngoing } from '../../../../../alt-model/wallet_interaction_hooks.js';
import { FeeSelector, FeeSelectorStatus, RadioButtonOption } from '../../../../../ui-components/index.js';
import { formatBulkPrice } from '../../../../../app/index.js';

interface DefiGasSectionProps {
  speed: DefiSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  recipe: DefiRecipe;
  bridgeCallData?: BridgeCallData;
}

function formatExpectedTimeOfSettlement(expectedTimeOfSettlement?: Date) {
  if (expectedTimeOfSettlement) return moment(expectedTimeOfSettlement).fromNow(true);
  return '';
}

function formatAverageTimeoutSeconds(averageTimeoutSeconds?: number) {
  if (averageTimeoutSeconds) return '~' + moment(Date.now() + averageTimeoutSeconds * 1000).fromNow(true);
  if (averageTimeoutSeconds === 0) return 'TBD';
  return '';
}

function formatFeeAmount(feeAmount?: Amount) {
  return feeAmount?.format({ layer: 'L2' });
}

function formatFeeBulkPrice(feeBulkPrice?: bigint) {
  return feeBulkPrice !== undefined ? `$${formatBulkPrice(feeBulkPrice)}` : undefined;
}

export function DefiGasSection(props: DefiGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts } = props;
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const rpStatus = useRollupProviderStatus();

  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const batchData = useDefiBatchData(props.bridgeCallData);
  const batchAverageTimeout = useDefiBatchAverageTimeout(props.recipe, props.bridgeCallData);

  const feeBulkPriceDeadline = useAmountBulkPrice(feeAmounts?.[DefiSettlementTime.DEADLINE]);
  const feeBulkPriceNextRollup = useAmountBulkPrice(feeAmounts?.[DefiSettlementTime.NEXT_ROLLUP]);
  const feeBulkPriceInstant = useAmountBulkPrice(feeAmounts?.[DefiSettlementTime.INSTANT]);

  const options: RadioButtonOption<DefiSettlementTime>[] = [];

  if (batchData?.isFastTrack) {
    options.push({
      id: DefiSettlementTime.DEADLINE,
      content: {
        label: 'Batched',
        timeStr: formatExpectedTimeOfSettlement(nextSettlementTime),
        feeAmountStr: formatFeeAmount(feeAmounts?.[DefiSettlementTime.DEADLINE]),
        feeBulkPriceStr: formatFeeBulkPrice(feeBulkPriceDeadline),
      },
    });
  } else {
    options.push({
      id: DefiSettlementTime.DEADLINE,
      content: {
        label: 'Batched',
        timeStr: formatAverageTimeoutSeconds(batchAverageTimeout),
        feeAmountStr: formatFeeAmount(feeAmounts?.[DefiSettlementTime.DEADLINE]),
        feeBulkPriceStr: formatFeeBulkPrice(feeBulkPriceDeadline),
      },
    });
    options.push({
      id: DefiSettlementTime.NEXT_ROLLUP,
      content: {
        label: 'Fast speed',
        timeStr: formatExpectedTimeOfSettlement(nextSettlementTime),
        feeAmountStr: formatFeeAmount(feeAmounts?.[DefiSettlementTime.NEXT_ROLLUP]),
        feeBulkPriceStr: formatFeeBulkPrice(feeBulkPriceNextRollup),
      },
    });
  }

  options.push({
    id: DefiSettlementTime.INSTANT,
    content: {
      label: 'Fastest speed',
      timeStr: formatExpectedTimeOfSettlement(instantSettlementTime),
      feeAmountStr: formatFeeAmount(feeAmounts?.[DefiSettlementTime.INSTANT]),
      feeBulkPriceStr: formatFeeBulkPrice(feeBulkPriceInstant),
    },
  });

  return (
    <FeeSelector
      label={'Select a speed for your transaction'}
      sublabel={`There are several options to choose from, depending on your budget`}
      value={speed}
      disabled={walletInteractionIsOngoing}
      status={speed !== undefined ? FeeSelectorStatus.Success : undefined}
      onChangeValue={onChangeSpeed}
      options={options}
    />
  );
}
