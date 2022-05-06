import { TxSettlementTime } from '@aztec/sdk';
import { Toggle } from 'ui-components';
import { Amount } from 'alt-model/assets';
import { RemoteAsset } from 'alt-model/types';
import { InputSection } from '../input_section';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from '../amount_section/mini_balance_indicators';
import { FeeBulkPriceSubLabel } from './fee_bulk_price_sub_label';
import { TxGasSaving } from './tx_gas_saving';
import { SectionInfo } from '../../modal_molecules/section_info';
import { useRollupProviderStatus } from 'alt-model';
import { estimateTxSettlementTimes } from 'alt-model/estimate_settlement_times';

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
  asset?: RemoteAsset;
  balanceType: BalanceType;
  targetAssetIsErc20?: boolean;
  deductionIsFromL1?: boolean;
}

export function TxGasSection(props: TxGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts, asset, balanceType, deductionIsFromL1 } = props;
  const rpStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);

  const options = [
    {
      value: TxSettlementTime.NEXT_ROLLUP,
      label: 'Slow',
      sublabel: (
        <FeeBulkPriceSubLabel
          expectedTimeOfSettlement={nextSettlementTime}
          feeAmount={feeAmounts?.[TxSettlementTime.NEXT_ROLLUP]}
          deductionIsFromL1={deductionIsFromL1}
        />
      ),
    },
    {
      value: TxSettlementTime.INSTANT,
      label: 'Instant',
      sublabel: (
        <FeeBulkPriceSubLabel
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
          <Toggle value={speed} onChangeValue={onChangeSpeed} options={options} height={100} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
