import { TxSettlementTime } from '@aztec/sdk';
import { Amount } from '../../../../../../alt-model/assets/index.js';
import { RemoteAsset } from '../../../../../../alt-model/types.js';
import { InputSection } from '../input_section/index.js';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from '../amount_section/mini_balance_indicators.js';
import { TxGasSaving } from './tx_gas_saving.js';
import { SectionInfo } from '../../modal_molecules/section_info/index.js';
import { useRollupProviderStatus } from '../../../../../../alt-model/index.js';
import { estimateTxSettlementTimes } from '../../../../../../alt-model/estimate_settlement_times.js';
import { VerticalRadioButtons } from '../../../../../../ui-components/components/inputs/vertical_radio_buttons/index.js';
import { FeeOptionContent } from './fee_option_content/index.js';

type BalanceType = 'L1' | 'L2';

function renderBalanceIndicator(balanceType: BalanceType, asset?: RemoteAsset) {
  switch (balanceType) {
    case 'L1':
      return <MiniL1BalanceIndicator asset={asset} />;
    case 'L2':
      return <MiniL2BalanceIndicator asset={asset} />;
  }
}

function renderInfo(props: TxGasSectionProps) {
  const selectedFeeAmount = props.feeAmounts?.[props.speed];
  switch (props.speed) {
    case TxSettlementTime.NEXT_ROLLUP:
      return (
        <>
          <p>Default speed. Join the next Aztec batch headed to Layer 1.</p>
          <TxGasSaving targetAssetIsErc20={props.targetAssetIsErc20} feeAmount={selectedFeeAmount} />
        </>
      );
    case TxSettlementTime.INSTANT:
      return <p>Fastest speed. Instant settlement to Ethereum.</p>;
  }
}

interface TxGasSectionProps {
  speed: TxSettlementTime;
  onChangeSpeed: (speed: TxSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  balanceType: BalanceType;
  targetAssetIsErc20?: boolean;
  deductionIsFromL1?: boolean;
}

export function TxGasSection(props: TxGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts, balanceType, deductionIsFromL1 } = props;
  const asset = feeAmounts?.[0]?.info;
  const rollupProviderStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rollupProviderStatus);

  const options = [
    {
      id: TxSettlementTime.NEXT_ROLLUP,
      content: (
        <FeeOptionContent
          label="Slow"
          expectedTimeOfSettlement={nextSettlementTime}
          feeAmount={feeAmounts?.[TxSettlementTime.NEXT_ROLLUP]}
          deductionIsFromL1={deductionIsFromL1}
        />
      ),
    },
    {
      id: TxSettlementTime.INSTANT,
      content: (
        <FeeOptionContent
          label="Instant"
          expectedTimeOfSettlement={instantSettlementTime}
          feeAmount={feeAmounts?.[TxSettlementTime.INSTANT]}
          deductionIsFromL1={deductionIsFromL1}
        />
      ),
    },
  ];

  return (
    <InputSection
      title="Transaction Fee"
      titleComponent={renderBalanceIndicator(balanceType, asset)}
      component={
        <>
          <VerticalRadioButtons value={speed} onChangeValue={onChangeSpeed} options={options} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
