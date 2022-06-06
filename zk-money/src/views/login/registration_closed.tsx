import styled from 'styled-components';
import { Text, TextLink } from '../../components';
import { SelfDismissingIncentiveModal } from '../incentive_modal';

const CenteredText = styled(Text)`
  text-align: center;
  line-height: 150%;
`;
const isOldSite = location.hostname === 'old.zk.money';

export function RegistrationClosed() {
  if (isOldSite)
    return (
      <>
        <CenteredText>
          Account creation disabled. Try the new zk.money{' '}
          <TextLink text="here" color="white" href="https://zk.money" underline inline />, or{' '}
          <TextLink text="login" color="white" href="/signin" underline inline /> to migrate your funds.
        </CenteredText>
        <SelfDismissingIncentiveModal instanceName="registration_closed" />
      </>
    );
  return (
    <CenteredText>
      Account creation is disabled. Registration will reopen will the launch of the new DeFi-enabled zk.money on the 9th
      June. <TextLink text="Login" color="white" href="/signin" underline inline /> to instead migrate your funds.
    </CenteredText>
  );
}
