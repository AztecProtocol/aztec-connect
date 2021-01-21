import React from 'react';
import styled from 'styled-components';
import { Button, Text } from '../components/ui';
import { spacings } from '../styles';
import { Section } from '../components/template';

const NotFoundRoot = styled.div`
  padding-bottom: ${spacings.xxl};
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;
`;

export const NotFound: React.FunctionComponent = () => {
  return (
    <NotFoundRoot>
      <Section title="Not Found">
        <Text size="m">{"Looks like you've followed a link that doesn't exist on this site."}</Text>
        <BackButtonRoot>
          <Button text="Back to zk.money" to="/" />
        </BackButtonRoot>
      </Section>
    </NotFoundRoot>
  );
};
