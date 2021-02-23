import React from 'react';
import styled from 'styled-components';
import { Button, PaddedBlock, Section, Sections, Text } from '../components';
import { spacings } from '../styles';

const Root = styled(Sections)`
  padding-bottom: ${spacings.xxl};
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;
`;

export const AboutBalance: React.FunctionComponent = () => (
  <Root>
    <Section title="About Your Balance">
      <Text size="m">
        <PaddedBlock>
          <Text weight="bold" inline>
            zk.money
          </Text>{' '}
          uses Aztec for cheap private transactions.
        </PaddedBlock>
        <PaddedBlock>
          Aztec represents your balance in an asset with UTXO notes. You can think of these as coins and notes in your
          wallet.
        </PaddedBlock>
        <PaddedBlock>
          Each time you do a transaction, only two coins or notes can be used to pay. The{' '}
          <Text weight="bold" inline>
            two largest notes
          </Text>
          , represent your spendable balance.
        </PaddedBlock>
        <PaddedBlock>
          Overtime your wallet will end up with lots of loose change, and your spendable balance will be smaller than
          your total balance. You can "merge" some of your coins together to increase your spendable balance.
        </PaddedBlock>
      </Text>
      <BackButtonRoot>
        <Button theme="gradient" text="Back to zk.money" to="/" />
      </BackButtonRoot>
    </Section>
  </Root>
);
