import { useState } from 'react';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/sdk';
import { SpeedSwitch, InfoWrap } from 'ui-components';
import { BlockTitle, BorderBox, InfoButton, Text } from 'components';
import { useAssetPrice } from 'alt-model';
import { Asset, convertToPriceString } from 'app';
import style from './gas_section.module.scss';

function Info() {
  return (
    <div className={style.infoRoot}>
      <Text text="Your zk assets are invested in one of the following ways:" />
      <Text>
        <Text inline italic weight="bold" text="Batched transaction: " />
        your funds are grouped with other users privately in a roll-up. These are then sent approx every 2 hours. This
        is the most cost effective transaction as everyone shares the fee.
      </Text>
    </div>
  );
}

function getTimingMessage(speed: DefiSettlementTime | TxSettlementTime) {
  switch (speed) {
    case DefiSettlementTime.NEXT_ROLLUP:
      return 'This transaction will be sent in a batch in [TODO] hours time.';
    default:
      return '[TODO: Some info about time]';
  }
}

export enum GasSectionType {
  DEFI = 'DEFI',
  TX = 'TX',
}

interface GasSectionProps {
  type: GasSectionType;
  speed: DefiSettlementTime | TxSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime | TxSettlementTime) => void;
  asset: Asset;
  fee: bigint | undefined;
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

export function GasSection(props: GasSectionProps) {
  const assetPrice = useAssetPrice(props.asset.id);
  const [showingInfo, setShowingInfo] = useState(false);
  const gasPrice =
    props.fee !== undefined &&
    assetPrice !== undefined &&
    `$${convertToPriceString(props.fee, props.asset.decimals, assetPrice)}`;

  let options: DefiOption[] | TxOption[] = DEFI_OPTIONS;
  if (props.type === GasSectionType.DEFI) {
    options = DEFI_OPTIONS;
  } else if (props.type === GasSectionType.TX) {
    options = TX_OPTIONS;
  }

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
                {gasPrice}
              </Text>
            }
          />
          <div className={style.header} />
          <SpeedSwitch value={props.speed} onChangeValue={props.onChangeSpeed} options={options} />
          <div className={style.centeredText}>
            <Text text={getTimingMessage(props.speed)} size="xxs" color="grey" />
            <Text size="xxs">
              You're saving{' '}
              <b>
                <i>[TODO:??]</i>
              </b>{' '}
              compared to L1!
            </Text>
            <Text size="xxs">[TODO:??] other people did this in the last hour</Text>
          </div>
          <InfoButton className={style.positionedInfoButton} onClick={() => setShowingInfo(true)} />
        </div>
      </InfoWrap>
    </BorderBox>
  );
}
