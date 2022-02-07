import { DoneGradientIcon } from 'ui-components/components/icons';
import styled from 'styled-components/macro';
import { Spacer, Text } from '../../../../components';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export function TransactionComplete() {
  return (
    <Root>
      <DoneGradientIcon />
      <Spacer size="m" />
      <Text color="gradient" text="Transaction Sent!" />
    </Root>
  );
}
