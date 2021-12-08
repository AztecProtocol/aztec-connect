import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, ContentWrapper, TextLink, PaddedBlock, RainDrops, Text } from '../components';
import { SupportStatus } from '../device_support';
import { borderRadiuses, breakpoints, fontSizes, lineHeights, spacings } from '../styles';
import { ShieldSelect } from './shield_select';

const HomeRoot = styled.div`
  position: relative;
  padding: ${spacings.xxl} 0 ${spacings.xl};

  @media (max-width: ${breakpoints.l}) {
    padding-top: ${spacings.l};
    text-align: center;
  }
`;

const ContentRoot = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas: 'shield text';
  gap: 100px;

  @media (max-width: ${breakpoints.l}) {
    grid-template-columns: unset;
    grid-template-rows: auto auto;
    grid-template-areas:
      'text'
      'shield';
    gap: ${spacings.m};
  }
`;

const ShieldCol = styled.div`
  grid-area: shield;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const ShieldSelectWrapper = styled.div`
  width: 100%;
  max-width: 480px;
`;

const LoginBlock = styled(PaddedBlock)`
  text-align: center;
`;

const TextCol = styled.div`
  grid-area: text;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SectionHead = styled(PaddedBlock)`
  font-size: ${fontSizes.xl};
  line-height: ${lineHeights.xl};

  @media (max-width: ${breakpoints.xs}) {
    font-size: ${fontSizes.l};
    line-height: ${lineHeights.l};
  }
`;

const SectionCaption = styled(PaddedBlock)`
  max-width: 480px;
`;

const AnimationRoot = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-280px);
`;

const UnsupportedRoot = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9;
`;

const UnsupportedContentWrapper = styled(ContentWrapper)`
  display: flex;
  justify-content: center;
`;

const UnsupportedPopup = styled.div`
  padding: ${spacings.l};
  background: rgba(0, 0, 0, 0.85);
  border-radius: ${borderRadiuses.m};
`;

const UnsupportedMessage = styled(Text)`
  padding-top: ${spacings.xs};
  padding-bottom: ${spacings.m};
`;

const getUnsupportedHeading = (status: SupportStatus) => {
  switch (status) {
    case 'firefox-private-unsupported':
      return 'Firefox private windows unsupported.';
    default:
      return 'Browser not supported.';
  }
};

const getUnsupportedText = (status: SupportStatus) => {
  switch (status) {
    case 'firefox-private-unsupported':
      return (
        "We recommend either exiting Firefox's private mode, or using a different browser.\n\n" +
        'Unfortunately in private mode Firefox disables IndexedDB interactions, which are necessary for zk.money to function.'
      );
    default:
      return 'We recommend using the latest browser on desktop or Android devices.';
  }
};

export interface HomeState {
  supportStatus: SupportStatus;
  ethPrice?: bigint;
}

interface HomeProps {
  onLogin: () => void;
  onSignupAndShield: (amount: bigint) => void;
  homeState: HomeState;
}

export const Home: React.FunctionComponent<HomeProps> = ({
  onLogin,
  onSignupAndShield,
  homeState: { supportStatus, ethPrice },
}) => {
  const [showUnsupported, setShowUnsupported] = useState(false);

  const handleLogin = () => {
    if (supportStatus !== 'supported') {
      setShowUnsupported(true);
    } else {
      onLogin();
    }
  };

  const handleSignupAndShield = (amount: bigint) => {
    if (supportStatus !== 'supported') {
      setShowUnsupported(true);
    } else {
      onSignupAndShield(amount);
    }
  };

  return (
    <HomeRoot>
      <AnimationRoot>
        <RainDrops />
      </AnimationRoot>
      <ContentRoot>
        <ShieldCol>
          <ShieldSelectWrapper>
            <ShieldSelect onSubmit={handleSignupAndShield} ethPrice={ethPrice} />
            <LoginBlock>
              <Text size="s">
                Already have an account?{' '}
                <TextLink color="white" underline inline onClick={handleLogin}>
                  Login
                </TextLink>
              </Text>
            </LoginBlock>
          </ShieldSelectWrapper>
        </ShieldCol>
        <TextCol>
          <SectionHead>
            <Text>
              {`Affordable, `}
              <Text weight="bold" text="private " inline />
              payments for Ethereum
            </Text>
          </SectionHead>
          <SectionCaption>
            <Text size="m">
              Connect{' '}
              <Text weight="bold" inline>
                your wallet
              </Text>{' '}
              and shield your first ETH to get started
            </Text>
          </SectionCaption>
        </TextCol>
      </ContentRoot>
      {showUnsupported && (
        <UnsupportedRoot>
          <UnsupportedContentWrapper>
            <UnsupportedPopup>
              <Text text={getUnsupportedHeading(supportStatus)} size="m" weight="semibold" />
              <UnsupportedMessage text={getUnsupportedText(supportStatus)} size="s" />
              <Button theme="white" size="m" text="Close" outlined onClick={() => setShowUnsupported(false)} />
            </UnsupportedPopup>
          </UnsupportedContentWrapper>
        </UnsupportedRoot>
      )}
    </HomeRoot>
  );
};
