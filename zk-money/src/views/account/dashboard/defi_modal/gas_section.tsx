import { DefiSettlementTime } from '@aztec/sdk';
import { useState } from 'react';
import styled from 'styled-components/macro';
import { useAssetPrice } from '../../../../alt-model';
import { Asset, convertToPriceString } from '../../../../app';
import { InfoWrap, Text, Spacer, InfoButton } from '../../../../components';
import { spacings } from '../../../../styles';
import { SpeedSwitch } from './speed_switch';

const Content = styled.div`
  padding: ${spacings.l} ${spacings.m};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`;

const CenteredText = styled.div`
  text-align: center;
`;

const PositionedInfoButton = styled(InfoButton)`
  /* position: absolute;
  right: 20px;
  bottom: 15px; */
`;

function Info() {
  return (
    <>
      <h3>Calculating your Gas Fee</h3>
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
    <InfoWrap showingInfo={showingInfo} infoContent={<Info />} onHideInfo={() => setShowingInfo(false)}>
      <Content>
        <Header>
          <Text>Gas Fee</Text>
          <Text weight="bold" italic size="s">
            {gasPrice}
          </Text>
        </Header>
        <Spacer />
        <SpeedSwitch value={props.speed} onChangeValue={props.onChangeSpeed} options={OPTS} />
        <Spacer />
        <CenteredText>
          <Text text={getTimingMessage(props.speed)} size="xxs" color="grey" />
          <Spacer />
          <Text size="xxs">
            You're saving{' '}
            <b>
              <i>[TODO:??]</i>
            </b>{' '}
            compared to L1!
          </Text>
          <Spacer />
          <Text size="xxs">[TODO:??] other people did this in the last hour</Text>
        </CenteredText>
        <Spacer />
        <PositionedInfoButton onClick={() => setShowingInfo(true)} />
      </Content>
    </InfoWrap>
  );
}
