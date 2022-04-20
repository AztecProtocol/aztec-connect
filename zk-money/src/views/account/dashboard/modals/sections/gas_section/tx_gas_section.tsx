import { TxSettlementTime } from '@aztec/sdk';
import { SpeedSwitch } from 'ui-components';
import { Amount } from 'alt-model/assets';
import { RemoteAsset } from 'alt-model/types';
import { InputSection } from '../input_section';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from '../amount_section/mini_balance_indicators';
import { FeeBulkPriceSubLabel } from './fee_bulk_price_sub_label';
import { TxGasSaving } from './tx_gas_saving';
import { SectionInfo } from '../../modal_molecules/section_info';

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
          <p>Transaction will be queued into the next rollup.</p>
          <TxGasSaving targetAssetIsErc20={props.targetAssetIsErc20} feeAmount={selectedFeeAmount} />
        </>
      );
    case TxSettlementTime.INSTANT:
      return (
        <>
          <p>Tranaction will kick off a rollup ahead of schedule.</p>
          <p>You’re getting fast settlement & privacy 😊</p>
        </>
      );
  }
}

interface TxGasSectionProps {
  speed: TxSettlementTime;
  onChangeSpeed: (speed: TxSettlementTime) => void;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  asset?: RemoteAsset;
  balanceType: BalanceType;
  targetAssetIsErc20?: boolean;
}

export function TxGasSection(props: TxGasSectionProps) {
  const { speed, onChangeSpeed, feeAmounts, asset, balanceType } = props;

  const options = [
    {
      value: TxSettlementTime.NEXT_ROLLUP,
      label: 'Slow',
      sublabel: <FeeBulkPriceSubLabel feeAmount={feeAmounts?.[TxSettlementTime.NEXT_ROLLUP]} />,
    },
    {
      value: TxSettlementTime.INSTANT,
      label: 'ASAP',
      sublabel: <FeeBulkPriceSubLabel feeAmount={feeAmounts?.[TxSettlementTime.INSTANT]} />,
    },
  ];

  return (
    <InputSection
      title={'Gas Fee'}
      titleComponent={renderBalanceIndicator(balanceType, asset)}
      component={
        <>
          <SpeedSwitch value={speed} onChangeValue={onChangeSpeed} options={options} />
          <SectionInfo>{renderInfo(props)}</SectionInfo>
        </>
      }
    />
  );
}
