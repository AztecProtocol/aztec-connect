import React from 'react';
import styled from 'styled-components/macro';
import { Button, Section, Text } from '../components';
import { breakpoints, spacings } from '../styles';

const Root = styled.div`
  padding-bottom: ${spacings.xxl};

  @media (max-width: ${breakpoints.s}) {
    text-align: center;
  }
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;

  @media (max-width: ${breakpoints.s}) {
    justify-content: center;
  }
`;

export const NotFound: React.FunctionComponent = () => (
  <Root>
    <Section title="Not Found">
      <Text size="m">{"Looks like you've followed a link that doesn't exist on this site."}</Text>
      <BackButtonRoot>
        <Button theme="white" text="Back to zk.money" to="/" />
      </BackButtonRoot>
    </Section>
  </Root>
);
