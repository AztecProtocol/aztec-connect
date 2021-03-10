import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, ContentWrapper, PaddedBlock, RainDrops, Text } from '../components';
import { borderRadiuses, breakpoints, fontSizes, lineHeights, spacings } from '../styles';

const HomeRoot = styled.div`
  position: relative;
  padding: ${spacings.xxl} 0 ${spacings.xl};

  @media (max-width: ${breakpoints.s}) {
    padding-top: ${spacings.l};
    text-align: center;
  }
`;

const ContentRoot = styled.div`
  position: relative;
  z-index: 1;
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

const ButtonRoot = styled(PaddedBlock)`
  display: flex;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    justify-content: center;
  }
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

interface HomeProps {
  onConnect: () => void;
  unsupported: boolean;
}

export const Home: React.FunctionComponent<HomeProps> = ({ onConnect, unsupported }) => {
  const [showUnsupported, setShowUnsupported] = useState(false);

  const secretMode = localStorage.getItem('secret') === 'tortilla';
  const handleConnect = () => {
    if (unsupported) {
      setShowUnsupported(true);
    } else {
      onConnect();
    }
  };

  return (
    <HomeRoot>
      <AnimationRoot>
        <RainDrops />
      </AnimationRoot>
      <ContentRoot>
        <SectionHead>
          <Text>
            {`Affordable, `}
            <Text weight="bold" text="private " inline></Text>
            {'crypto'}
          </Text>
          <Text text={secretMode ? 'payments have arrived.' : 'payments are coming...'} />
        </SectionHead>
        <SectionCaption>
          {secretMode && (
            <Text size="m">
              Connect{' '}
              <Text weight="bold" inline>
                your wallet
              </Text>{' '}
              to get started
            </Text>
          )}
          {!secretMode && <Text size="m" text="We are busy updating to Aztec V2, stay tuned for updates!" />}
        </SectionCaption>
        {!showUnsupported && (
          <ButtonRoot>
            {secretMode && <Button theme="white" text="Connect" onClick={handleConnect} />}
            {!secretMode && <Button theme="white" text="Go to V1" href="https://old.zk.money/" />}
          </ButtonRoot>
        )}
      </ContentRoot>
      {showUnsupported && (
        <UnsupportedRoot>
          <UnsupportedContentWrapper>
            <UnsupportedPopup>
              <Text text="Browser not supported." size="m" weight="semibold" />
              <UnsupportedMessage
                text="We recommend using the latest browser on desktop or Android devices."
                size="s"
              />
              <Button theme="white" size="m" text="Fine" outlined onClick={() => setShowUnsupported(false)} />
            </UnsupportedPopup>
          </UnsupportedContentWrapper>
        </UnsupportedRoot>
      )}
    </HomeRoot>
  );
};
