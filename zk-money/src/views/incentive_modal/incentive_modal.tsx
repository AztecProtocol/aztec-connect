import closeIconWhite from '../../images/close_white.svg';
import incentiveWaveOverlay from '../../images/incentive_wave_overlay.svg';
import incentiveWaveBackground from '../../images/incentive_wave_background.svg';
import hyperlink from '../../images/hyperlink.svg';
import { useState } from 'react';
import * as S from './incentive_modal_styled_components';

export interface IncentiveModalProps {
  onClose: () => void;
}

function IncentiveModal(props: IncentiveModalProps) {
  const handleExplore = () => {
    props.onClose();
    window.location.href = 'https://zk.money';
  };
  return (
    <S.IncentiveModal title="" noPadding>
      <S.IncentiveModalWrapper>
        <S.Background src={incentiveWaveBackground} alt="" />
        <S.HeaderOverlay src={incentiveWaveOverlay} />
        <S.Text>
          <S.Title>Looking for private DeFi? zk.money has a new home!</S.Title>
          <S.Body>
            This version of zk.money no longer supports new account registrations, and system functionality will be
            deprecated in 6 months.
          </S.Body>
          <S.Body2>
            Existing aliases have been preserved and migrated to the new system. Read our full announcement{' '}
            <S.TextLink href="https://medium.com/@jonwu_" target="_blank" rel="noreferrer">
              here
            </S.TextLink>
            .
          </S.Body2>
          <S.StepsHeading>To migrate to new zk.money:</S.StepsHeading>
          <S.Steps>
            <S.Step>
              <S.StepHeading>1</S.StepHeading>
              <div>
                <S.StepText>Send existing zk.money funds to an Ethereum L1 address.</S.StepText>
                <S.StepText>Remember to use a fresh address for withdrawals!</S.StepText>
              </div>
            </S.Step>
            <S.Step>
              <S.StepHeading>2</S.StepHeading>
              <S.StepText>Access new zk.money here and claim your registered alias.</S.StepText>
            </S.Step>
            <S.Step>
              <S.StepHeading>3</S.StepHeading>
              <S.StepText>
                Shield funds from your Ethereum L1 wallet to new zk.money. You now have access to fully private DeFi!
              </S.StepText>
            </S.Step>
          </S.Steps>
        </S.Text>
        <S.Close src={closeIconWhite} onClick={props.onClose} alt="Close button" />
        <S.Button onClick={handleExplore}>
          Explore <img src={hyperlink} />
        </S.Button>
      </S.IncentiveModalWrapper>
    </S.IncentiveModal>
  );
}

interface SelfDismissingIncentiveModalProps {
  instanceName: string;
}

const isOldSite = location.hostname === 'old.zk.money';
const isPostLaunch = Date.now() > new Date('2022-06-09T17:00Z').getTime();

export function SelfDismissingIncentiveModal(props: SelfDismissingIncentiveModalProps) {
  const storageKey = `incentive_modal_was_closed:${props.instanceName}`;
  const [isShowing, setIsShowing] = useState(!localStorage.getItem(storageKey));
  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setIsShowing(false);
  };

  if (!isShowing || !isOldSite || !isPostLaunch) return <></>;
  return <IncentiveModal onClose={handleClose} />;
}
