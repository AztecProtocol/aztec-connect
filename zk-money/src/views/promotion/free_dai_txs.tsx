import Cookie from 'js-cookie';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components/macro';
import { BubbleTheme, Button, Modal, MovingBubble, PaddedBlock, Text, TextLink } from '../../components';
import dai from '../../images/dai_white.svg';

const ButtonRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const freeDaiTxsStatusCookie = '_zm_free_dai_txs';

const expiration = moment('2021-04-30').endOf('day').add(7, 'days');

const disableAutoPopup = () => Cookie.set(freeDaiTxsStatusCookie, 'disabled', { expires: 30 });

const visibilityWait = 15 * 1000;

interface FreeDaiTxsProps {
  activeAsset: number;
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
      <MovingBubble theme={BubbleTheme.SECONDARY} icon={dai} />
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
