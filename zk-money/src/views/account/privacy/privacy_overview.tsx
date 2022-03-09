import type { RemoteAsset } from 'alt-model/types';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components/macro';
import { PrivacyIssue } from '../../../app';
import { colours, gradients, lineHeights, Spacing, spacings } from '../../../styles';
import { CrossFade, Link, Text } from '../../../components';
import { Bucket, useDepositorBuckets } from './privacy_util';
import { ShieldMeter } from './shield_meter';
import { CrowdVisualisation } from './crowd_visualisation';
import { PrivacySetDial } from './privacy_set_dial';
import collapseIcon from '../../../images/collapse_icon.svg';
import faqIcon from '../../../images/faq_icon.svg';

const expandButtonHeight = 37;
const drawerPeek = expandButtonHeight + parseInt(spacings.m) * 2;

const Root = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(170deg, ${gradients.primary.from} 11.12%, ${gradients.primary.to} 58.22%);
  color: ${colours.white};
  height: 100%;
  padding-top: ${spacings.l};
  padding-bottom: ${drawerPeek}px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Spacer = styled.div<{ size: Spacing }>`
  width: 100%;
  height: ${({ size }) => spacings[size]};
`;

const CrowdWrapper = styled.div<{ visible: boolean }>`
  will-change: opacity;
  transition: opacity 0.4s;
  opacity: 1;
  ${({ visible }) =>
    !visible &&
    `
      transition-delay: 0.4s;
      opacity: 0;
      pointer-events: none;
  `};
`;

const TipWrapper = styled.div`
  flex-grow: 1;
  text-align: center;
  padding: ${spacings.m};
  line-height: ${lineHeights.m};
`;

const ButtonLabelWrapper = styled.div`
  width: 100%;
  text-align: center;
  padding: 0 ${spacings.m};
  height: ${spacings.l};
`;

const FaqIcon = styled.div`
  width: 47px;
  height: 37px;
  background: url(${faqIcon});
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
`;

const FaqLinkWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const Drawer = styled.div<{ expanded: boolean; visible: boolean }>`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(100% - 160px);
  will-change: transform, opacity;
  transition: ${({ expanded }) =>
    expanded ? 'transform 0.4s ease-out 0.4s, opacity 0.4s' : 'transform 0.4s ease 0s, opacity 0.4s'};
  transform: translateY(${({ expanded }) => (expanded ? '0' : `calc(100% - ${drawerPeek}px)`)});
  opacity: 1;
  ${({ visible }) =>
    !visible &&
    `
      opacity: 0;
      pointer-events: none;
  `}
  display: grid;
  grid-template-areas: 'drawer';
`;

const DrawerContent = styled.div`
  position: relative; // Otherwise PrivacySetDial's Header get lost
  grid-area: drawer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${spacings.m} ${spacings.s};
  gap: ${spacings.m};
`;

const DrawerBgFill = styled.div<{ expanded: boolean }>`
  grid-area: drawer;
  border-top: solid ${colours.white} 1px;
  background-image: linear-gradient(170deg, ${gradients.primary.from} 11.12%, ${gradients.primary.to} 58.22%);
  will-change: opacity;
  transition: opacity 0.4s;
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  transition-delay: ${({ expanded }) => (expanded ? '0s' : '0.4s')};
`;

const ExpandButton = styled.button<{ expanded: boolean }>`
  border: none;
  cursor: pointer;
  width: ${expandButtonHeight}px;
  height: ${expandButtonHeight}px;
  background: url(${collapseIcon});
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  will-change: transform;
  transition: transform 0.4s ease ${({ expanded }) => (expanded ? '0s' : '0.4s')};
  transform: rotate(${({ expanded }) => (expanded ? '0deg' : '60deg')});
`;

const approxCrowdFormatter = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 1, notation: 'compact' });

const calcState = (
  buckets: Bucket[] | undefined,
  { isWithdrawal, privacyIssue, amount, asset }: PrivacyOverviewProps,
): {
  score: number;
  crowd: number | 'hidden';
  tip: string;
  extra: 'faq' | 'drawer' | 'none';
} => {
  if (!isWithdrawal) {
    return {
      score: 1,
      crowd: 'hidden' as const,
      tip: 'Transactions with another Aztec alias are end-to-end encrypted and fully private.',
      extra: 'none',
    };
  }
  const countFromPrivacySet = buckets?.find(b => b.lowerBound >= amount)?.count ?? 1;
  const crowd = privacyIssue === 'none' ? countFromPrivacySet : 1;
  const approxCrowd = approxCrowdFormatter.format(crowd);
  if (crowd < 2) {
    return {
      score: 0,
      crowd,
      tip: 'The crowd is gone. Everyone can see this payment is you.\n\nAlways use a fresh address for withdrawls',
      extra: 'faq',
    };
  } else if (crowd < 30) {
    return {
      score: 0.1,
      crowd,
      tip: `The crowd is tiny. This payment hides in ~${approxCrowd} people.\n\nTry sending a smaller amount or waiting for more deposits.`,
      extra: 'drawer',
    };
  } else if (crowd < 100) {
    return {
      score: 0.5,
      crowd,
      tip: `The crowd is small. This payment hides in ~${approxCrowd} people.\n\nTry sending a smaller amount or waiting for more deposits.`,
      extra: 'drawer',
    };
  } else if (crowd < 500) {
    return {
      score: 0.8,
      crowd,
      tip: `The crowd is large. This payment hides in ~${approxCrowd} people`,
      extra: 'drawer',
    };
  } else {
    return {
      score: 1,
      crowd,
      tip: `The crowd is huge. This payment hides in ~${approxCrowd} people`,
      extra: 'drawer',
    };
  }
};

interface PrivacyOverviewProps {
  amount: bigint;
  asset: RemoteAsset;
  isWithdrawal: boolean;
  privacyIssue: PrivacyIssue;
}

export const PrivacyOverview: React.FunctionComponent<PrivacyOverviewProps> = props => {
  const [drawExpanded, setDrawerExpanded] = useState(false);
  const [debouncedProps, setDebouncedProps] = useState(props);
  useEffect(() => {
    const task = setTimeout(() => setDebouncedProps(props), 500);
    return () => clearTimeout(task);
  }, [props]);
  const { asset, amount } = debouncedProps;
  const buckets = useDepositorBuckets(asset.address);
  const { score, crowd, tip, extra } = calcState(buckets, debouncedProps);
  return (
    <Root>
      <ShieldMeter score={score} asset={asset} />
      <Spacer size="l" />
      <CrowdWrapper visible={crowd !== 'hidden'}>
        <CrowdVisualisation size={crowd === 'hidden' ? 1 : crowd} />
      </CrowdWrapper>
      <Spacer size="m" />
      <TipWrapper>
        <CrossFade duration={500}>
          <Text key={tip} size="s" text={tip} />
        </CrossFade>
      </TipWrapper>
      <ButtonLabelWrapper>
        <CrossFade duration={500}>
          {extra === 'drawer' && <Text key="drawer" size="s" text="Learn more about your privacy set" />}
          {extra === 'faq' && (
            <FaqLinkWrapper key="faq">
              <Link
                href="https://aztec-protocol.gitbook.io/zk-money/faq/faq-privacy#are-withdrawals-private"
                target="_blank"
              >
                <FaqIcon />
              </Link>
            </FaqLinkWrapper>
          )}
        </CrossFade>
      </ButtonLabelWrapper>
      <Drawer expanded={drawExpanded} visible={extra === 'drawer'}>
        <DrawerBgFill expanded={drawExpanded} />
        <DrawerContent>
          <ExpandButton
            expanded={drawExpanded}
            onClick={() => extra === 'drawer' && setDrawerExpanded(!drawExpanded)}
          />
          <Text weight="bold" text="Privacy Analytics" />
          <Text size="s" text="The depositor set from which this withdrawal plus fees could be made." />
          <PrivacySetDial amount={amount} asset={asset} />
        </DrawerContent>
      </Drawer>
    </Root>
  );
};
