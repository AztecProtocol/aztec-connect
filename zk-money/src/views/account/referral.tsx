import Cookie from 'js-cookie';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { assets } from '../../app';
import { Button, GradientBlock, Modal, PaddedBlock, Text } from '../../components';
import { breakpoints, spacings } from '../../styles';

const CouponRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const Coupon = styled(GradientBlock)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  width: auto;
  min-width: 400px;
  height: 240px;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    min-width: 0;
  }
`;

const CouponFoot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
`;

const AliasText = styled(Text)`
  padding-right: ${spacings.s};
  word-break: break-all;
`;

const AssetIconsRoot = styled.div`
  display: flex;
  align-items: center;
  margin: 0 -12px;
`;

const AssetIconRoot = styled.div`
  padding: 0 12px;
`;

const ButtonRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const iconSizes = [28, 20, 24];

const referralStatusCookie = '_zm_referral';

const expiration = new Date('2021-04-15 23:59:59').getTime();

const visibilityWait = 45 * 1000;

const reminderInterval = 7; // days

interface ReferralProps {
  alias: string;
}

export const Referral: React.FunctionComponent<ReferralProps> = ({ alias }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const status = Cookie.get(referralStatusCookie);
    const expired = Date.now() > expiration;
    let showModelTimeout: number;
    if (!status && !visible && !expired) {
      showModelTimeout = window.setTimeout(() => {
        setVisible(true);
      }, visibilityWait);
    }

    return () => {
      clearTimeout(showModelTimeout);
    };
  }, [visible]);

  if (!visible) {
    return <></>;
  }

  const shareOnTwitter = () => {
    const url = `https://zk.money?alias=${alias}`;
    const text =
      'I just signed up for zk.money. Sign up below to send crypto privately and a chance to win 1 zkETH. @aztecnetwork';
    window.open(`http://twitter.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
  };

  const handleClose = () => {
    Cookie.set(referralStatusCookie, 'disabled', { expires: reminderInterval });
    setVisible(false);
  };

  return (
    <Modal title="Tell your friends!" onClose={handleClose}>
      <PaddedBlock size="l">
        <Text size="m">
          {'Great news '}
          <Text text={`@${alias}`} weight="bold" inline />
          {', you bagged a great username.'}
        </Text>
      </PaddedBlock>
      <CouponRoot size="l">
        <Coupon>
          <Text text="zk.money" size="l" />
          <CouponFoot>
            <AliasText text={`@${alias}`} size="m" />
            <AssetIconsRoot>
              {assets.map(a => (
                <AssetIconRoot key={a.id}>
                  <img src={a.iconWhite} alt="" height={iconSizes[a.id]} />
                </AssetIconRoot>
              ))}
            </AssetIconsRoot>
          </CouponFoot>
        </Coupon>
      </CouponRoot>
      <PaddedBlock size="s">
        <PaddedBlock size="s">
          <Text size="m">
            {
              'The more people who use zk.money the better the anonymity set is for everyone. To help grow the initial users, we are giving '
            }
            <Text text="1 zkETH away until April 15th." weight="bold" inline />
          </Text>
        </PaddedBlock>
        <PaddedBlock size="s">
          <Text
            size="m"
            text="For a chance to win, share zk.money on twitter using the link below. We will pick winners once a week and announce the winner on our twitter."
          />
        </PaddedBlock>
        <PaddedBlock size="s">
          <Text size="m" text="Don’t worry your balances and transactions are 100% private!" />
        </PaddedBlock>
      </PaddedBlock>
      <ButtonRoot size="l">
        <Button theme="gradient" text="Share on twitter" size="l" onClick={shareOnTwitter} />
      </ButtonRoot>
    </Modal>
  );
};
