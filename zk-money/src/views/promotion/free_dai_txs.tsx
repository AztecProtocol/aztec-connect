import { AssetId } from '@aztec/sdk';
import Cookie from 'js-cookie';
import moment from 'moment';
import { rgba } from 'polished';
import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button, Modal, PaddedBlock, Text, TextLink } from '../../components';
import bubble from '../../images/bubble.svg';
import dai from '../../images/dai_white.svg';
import { colours, spacings } from '../../styles';

const move = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(240px);
  }
`;

const BubbleRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const BubbleWrap = styled.div`
  position: relative;
  padding: ${spacings.s} ${spacings.m};
`;

const Bubble = styled.img`
  position: absolute;
  margin-top: 3px; // extra space at the bottom of the svg
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  height: 120px;
`;

const BubbleContent = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const Circle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 100%;
  z-index: 2;
`;

const CircleLeft = styled(Circle)`
  background-image: linear-gradient(0deg, #bcf24a, #44ff6d);
`;

const CircleRight = styled(Circle)`
  background-image: linear-gradient(0deg, #f24a4a, #ffb444);
`;

const DotsRoot = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.s};
`;

const Dot = styled.div`
  margin: 0 ${spacings.xxs};
  width: 4px;
  height: 4px;
  border-radius: 100%;
  background: ${colours.grey};
  opacity: 0.3;
`;

const CargoRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 40px;
  width: 32px;
  height: 32px;
  border-radius: 100%;
  background: ${rgba(colours.black, 0.75)};
  z-index: 1;
  animation: ${move} 2s infinite linear 2s;

  &:before {
    content: '';
    position: absolute;
    left: -${spacings.xxs};
    transform: translateX(-100%);
    width: 16px;
    height: 16px;
    border-radius: 100%;
    background: ${rgba(colours.black, 0.5)};
  }

  &:after {
    content: '';
    position: absolute;
    left: -${parseInt(spacings.xs) + 16}px;
    transform: translateX(-100%);
    width: 8px;
    height: 8px;
    border-radius: 100%;
    background: ${rgba(colours.black, 0.3)};
  }
`;

const ButtonRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const freeDaiTxsStatusCookie = '_zm_free_dai_txs';

const expiration = moment('2021-04-30').endOf('day').add(7, 'days');

const disableAutoPopup = () => Cookie.set(freeDaiTxsStatusCookie, 'disabled', { expires: 30 });

const visibilityWait = 15 * 1000;

interface FreeDaiTxsProps {
  activeAsset: AssetId;
  onSubmit(): void;
}

export const FreeDaiTxs: React.FunctionComponent<FreeDaiTxsProps> = ({ activeAsset, onSubmit }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const status = Cookie.get(freeDaiTxsStatusCookie);
    let showModelTimeout: number;
    if (!status && !visible) {
      showModelTimeout = window.setTimeout(() => {
        setVisible(true);
      }, visibilityWait);
    }
    if (!status) {
      disableAutoPopup();
    }

    return () => {
      clearTimeout(showModelTimeout);
    };
  }, [visible, activeAsset]);

  if (!visible) {
    return <></>;
  }

  const handleClose = () => {
    disableAutoPopup();
    setVisible(false);
  };

  const daysFromNow = Math.max(1, expiration.diff(moment(), 'days'));

  return (
    <Modal title="Introducing zkDAI" onClose={handleClose}>
      <PaddedBlock size="s">
        <PaddedBlock size="xs">
          <Text size="s">
            {'Great news! '}
            <Text text="zkDAI" weight="bold" inline />
            {' has been added to the platform, enabling private stable transactions. To celebrate the launch, '}
            <Text
              text={`DAI transactions are free for the next ${daysFromNow} day${daysFromNow ? 's' : ''}.`}
              weight="bold"
              inline
            />
          </Text>
        </PaddedBlock>
        <PaddedBlock size="xs">
          <Text size="s">
            {
              'Once you have shielded your first DAI (which will still cost L1 gas fees), your L2 private transactions will be free for the first week! No more excuses to start paying your friends back!'
            }
          </Text>
        </PaddedBlock>
      </PaddedBlock>
      <BubbleRoot size="s">
        <BubbleWrap>
          <Bubble src={bubble} />
          <BubbleContent>
            <CircleLeft />
            <DotsRoot>
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <Dot key={i} />
                ))}
            </DotsRoot>
            <CircleRight />
            <CargoRoot>
              <img src={dai} alt="" height={16} />
            </CargoRoot>
          </BubbleContent>
        </BubbleWrap>
      </BubbleRoot>
      <PaddedBlock size="s">
        <PaddedBlock size="xs">
          <Text size="s">
            {'In tandem we are running a giveaway, to grow the privacy set for everyone. One user will win '}
            <Text text="1000 DAI" weight="bold" inline />
            {'.'}
          </Text>
        </PaddedBlock>
        <PaddedBlock size="xs">
          <Text size="s">
            {
              'To be elgible, simply shield at least 1000 zkDAI from a L1 address. Aztec will pick a winner and send 1000 DAI anonymously to that addres.'
            }
          </Text>
        </PaddedBlock>
        <PaddedBlock size="xs">
          <Text size="s">
            {'We will annouce the winner on '}
            <TextLink text="Twitter" href="https://twitter.com/aztecnetwork" target="_blank" color="indigo" inline />
            {' once the anonimity set reaches 100,000 DAI.'}
          </Text>
        </PaddedBlock>
      </PaddedBlock>
      <ButtonRoot size="s">
        <Button
          theme="gradient"
          text="Take me to zkDai"
          onClick={() => {
            handleClose();
            onSubmit();
          }}
        />
      </ButtonRoot>
    </Modal>
  );
};
