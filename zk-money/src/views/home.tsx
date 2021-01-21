import React from 'react';
import styled from 'styled-components';
import { Text, ContentRow, Content, ContentCol, Button } from '../components/ui';
import Raindrops from '../components/raindrops';
import { spacings } from '../styles';

const HomeRoot = styled.div`
  padding-top: ${spacings.xxl};
  width: 100%;
  display: flex;
  height: 100%;
`;
const TextRoot = styled.div`
  margin: 0;
  float: left;
`;

const StyledText = styled.div`
  .gradient {
    background: linear-gradient(101.14deg, #940dff 11.12%, #0094ff 58.22%, #0094ff 58.22%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const MarginTop = styled.div`
  margin-top: ${spacings.xl};
`;

const AnimationRoot = styled.div`
  position: absolute;
  padding-top: ${spacings.xxl};
  left: -10%;
`;

export const Home: React.FunctionComponent = () => {
  return (
    <HomeRoot>
      <AnimationRoot>
        <Raindrops />
      </AnimationRoot>
      <Content padding="none">
        <ContentRow padding="none">
          <ContentCol column={90} padding="none">
            <TextRoot>
              <Text size="xl" weight="light" text="Affordable, "></Text>
            </TextRoot>
            <TextRoot>
              <Text size="xl" weight="normal" text="private "></Text>
            </TextRoot>
            <TextRoot>
              <Text size="xl" weight="light">
                crypto
              </Text>
            </TextRoot>
            <TextRoot>
              <Text size="xl" weight="light">
                payments are coming...
              </Text>
            </TextRoot>
          </ContentCol>
        </ContentRow>
        <ContentRow padding="none">
          <ContentCol column={53} padding="none">
            <MarginTop>
              <Text size="m" weight="light" text="We are busy updating to Aztec V2, stay tuned for updates!" />
            </MarginTop>
          </ContentCol>
        </ContentRow>
        <ContentRow padding="none">
          <MarginTop>
            <Button theme="white" href="https://old.zk.money/zkAsset/zkDai">
              <StyledText>
                <Text className="gradient">Go to V1</Text>
              </StyledText>
            </Button>
          </MarginTop>
        </ContentRow>
      </Content>
    </HomeRoot>
  );
};
