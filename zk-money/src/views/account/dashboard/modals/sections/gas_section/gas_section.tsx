import { useState } from 'react';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/sdk';
import { SpeedSwitch, InfoWrap } from 'ui-components';
import { BlockTitle, BorderBox, InfoButton, Text } from 'components';
import { useAmountCost } from 'alt-model';
import { formatCost } from 'app';
import style from './gas_section.module.scss';
import { DefiGasSavings } from './def_gas_savings';
import { Amount } from 'alt-model/assets';
import { DefiRecipe } from 'alt-model/defi/types';
import { DefiRollupTiming } from './defi_rollup_timing';

function Info() {
  return (
    <>
      <p>Your zk assets are invested in one of the following ways:</p>
      <p>
        <b>
          <i>Batched transaction: </i>
        </b>
        your funds are grouped with other users privately in a roll-up. These are then sent approx every 2 hours. This
        is the most cost effective transaction as everyone shares the fee.
      </p>
    </>
  );
}

export enum GasSectionType {
  DEFI = 'DEFI',
  TX = 'TX',
}

interface GasSectionProps {
  type: GasSectionType;
  speed: DefiSettlementTime | TxSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime | TxSettlementTime) => void;
  feeAmount?: Amount;
  recipe?: DefiRecipe;
}

interface DefiOption {
  value: DefiSettlementTime;
  label: string;
}

interface TxOption {
  value: TxSettlementTime;
  label: string;
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

export function GasSection({ type, speed, onChangeSpeed, feeAmount, recipe }: GasSectionProps) {
  const [showingInfo, setShowingInfo] = useState(false);
  const feeCost = useAmountCost(feeAmount);
  const feeCostStr = feeCost !== undefined ? `$${formatCost(feeCost)}` : undefined;

  let options: DefiOption[] | TxOption[] = DEFI_OPTIONS;
  if (type === GasSectionType.DEFI) {
    options = DEFI_OPTIONS;
  } else if (type === GasSectionType.TX) {
    options = TX_OPTIONS;
  }

  const shouldShowDefiBatchingInfo =
    type === GasSectionType.DEFI && speed === DefiSettlementTime.DEADLINE && recipe !== undefined;

  return (
    <BorderBox className={style.gasSection} area="fee">
      <InfoWrap
        showingInfo={showingInfo}
        infoHeader={<Text weight="bold" text="Calculating your Gas Fee" />}
        infoContent={<Info />}
        onHideInfo={() => setShowingInfo(false)}
        borderRadius={20}
      >
        <div className={style.content}>
          <BlockTitle
            title="Gas Fee"
            info={
              <Text weight="bold" italic>
                {feeCostStr}
              </Text>
            }
          />
          <div className={style.header} />
          <SpeedSwitch value={speed} onChangeValue={onChangeSpeed} options={options} />
          <div className={style.centeredText}>
            {shouldShowDefiBatchingInfo && (
              <Text size="xxs" color="grey">
                <DefiRollupTiming recipe={recipe} />
              </Text>
            )}
            {shouldShowDefiBatchingInfo && (
              <Text size="xxs">
                <DefiGasSavings feeAmount={feeAmount} bridgeAddressId={recipe.addressId} />
              </Text>
            )}
          </div>
          <InfoButton className={style.positionedInfoButton} onClick={() => setShowingInfo(true)} />
        </div>
      </InfoWrap>
    </BorderBox>
  );
}
