import styled from 'styled-components';
import { Text, TextLink } from '../../components';

const CenteredText = styled(Text)`
  text-align: center;
`;

export function RegistrationClosed() {
  return (
    <CenteredText>
      Account creation disabled. Try the new zk.money{' '}
      <TextLink text="here" color="white" href="https://zk.money" underline inline />, or{' '}
      <TextLink text="login" color="white" href="/signin" underline inline /> to migrate your funds.
    </CenteredText>
  );
}
