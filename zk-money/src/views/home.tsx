import React from 'react';
import styled from 'styled-components';
import { Button, PaddedBlock, RainDrops, Text } from '../components';
import { breakpoints, fontSizes, lineHeights, spacings } from '../styles';

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

interface HomeProps {
  onConnect: () => void;
}

export const Home: React.FunctionComponent<HomeProps> = ({ onConnect }) => {
  const secretMode = localStorage.getItem('secret') === 'tortilla';
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
        <ButtonRoot>
          {secretMode && <Button theme="white" text="Connect" onClick={onConnect} />}
          {!secretMode && <Button theme="white" text="Go to V1" href="https://old.zk.money/" />}
        </ButtonRoot>
      </ContentRoot>
    </HomeRoot>
  );
};
