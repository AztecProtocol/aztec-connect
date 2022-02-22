import { DefiSettlementTime } from '@aztec/sdk';
import { useState } from 'react';
import styled from 'styled-components/macro';
import { InfoWrap } from 'ui-components';
import { useAssetPrice } from '../../../../alt-model';
import { Asset, convertToPriceString } from '../../../../app';
import { Text, Spacer, InfoButton } from '../../../../components';
import { spacings } from '../../../../styles';
import { SpeedSwitch } from './speed_switch';

const S = {
  Content: styled.div`
    padding: ${spacings.m};
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `,

  Header: styled.div`
    display: flex;
    justify-content: space-between;
  `,

  CenteredText: styled.div`
    text-align: center;
    height: 33%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `,

  PositionedInfoButton: styled(InfoButton)`
    position: absolute;
    right: 10px;
    bottom: 10px;
  `,

  InfoRoot: styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    line-height: 200%;
  `,
};

function Info() {
  return (
    <S.InfoRoot>
      <Text text="Your zk assets are invested in one of the following ways:" />
      <Text>
        <Text inline italic weight="bold" text="Batched transaction: " />
        your funds are grouped with other users privately in a roll-up. These are then sent approx every 2 hours. This
        is the most cost effective transaction as everyone shares the fee.
      </Text>
    </S.InfoRoot>
  );
}

function getTimingMessage(speed: DefiSettlementTime) {
  switch (speed) {
    case DefiSettlementTime.NEXT_ROLLUP:
      return 'This transaction will be sent in a batch in [TODO:??] hours time.';
    default:
      return '[TODO: Some info about time]';
  }
}

interface GasSectionProps {
  speed: DefiSettlementTime;
  onChangeSpeed: (speed: DefiSettlementTime) => void;
  asset: Asset;
  fee: bigint | undefined;
}

// TODO: check these are right values
const OPTS = [
  { value: DefiSettlementTime.DEADLINE, label: 'Batched' },
  { value: DefiSettlementTime.NEXT_ROLLUP, label: 'Fast Track' },
  { value: DefiSettlementTime.INSTANT, label: 'Instant' },
];

export function GasSection(props: GasSectionProps) {
  const assetPrice = useAssetPrice(props.asset.id);
  const [showingInfo, setShowingInfo] = useState(false);
  const gasPrice =
    props.fee !== undefined &&
    assetPrice !== undefined &&
    `$${convertToPriceString(props.fee, props.asset.decimals, assetPrice)}`;
  return (
    <InfoWrap
      showingInfo={showingInfo}
      infoHeader={<Text weight="bold" text="Calculating your Gas Fee" />}
      infoContent={<Info />}
      onHideInfo={() => setShowingInfo(false)}
      borderRadius={20}
    >
      <S.Content>
        <S.Header>
          <Text>Gas Fee</Text>
          <Text weight="bold" italic>
            {gasPrice}
          </Text>
        </S.Header>
        <SpeedSwitch value={props.speed} onChangeValue={props.onChangeSpeed} options={OPTS} />
        <S.CenteredText>
          <Text text={getTimingMessage(props.speed)} size="xxs" color="grey" />
          <Text size="xxs">
            You're saving{' '}
            <b>
              <i>[TODO:??]</i>
            </b>{' '}
            compared to L1!
          </Text>
          <Text size="xxs">[TODO:??] other people did this in the last hour</Text>
        </S.CenteredText>
        <S.PositionedInfoButton onClick={() => setShowingInfo(true)} />
      </S.Content>
    </InfoWrap>
  );
}
