import { Block, FlexBox, TextButton } from '@aztec/guacamole-ui';
import { EthAddress } from 'barretenberg/address';
import React, { useState, useEffect } from 'react';
import { Form, FormSection } from '../components';
import { UserTxs } from './user_txs';
import { SdkEvent, WebSdk } from 'aztec2-sdk';

const UserTitle = ({ app, account, alias }: { app: WebSdk; account: EthAddress; alias?: string }) => (
  <FlexBox valign="center">
    <Block right="m">{alias || account.toString()}</Block>
    <TextButton theme="implicit" text="Unlink" onClick={() => app.getSdk().removeUser(account)} />
  </FlexBox>
);

interface DataExplorerProps {
  app: WebSdk;
}

export const LocalState = ({ app }: DataExplorerProps) => {
  const [users, setUsers] = useState(app.getSdk().getUsersData());

  useEffect(() => {
    const handleUpdateUsers = () => setUsers(app.getSdk().getUsersData());
    app.on(SdkEvent.UPDATED_USERS, handleUpdateUsers);

    return () => {
      app.off(SdkEvent.UPDATED_USERS, handleUpdateUsers);
    };
  }, [app]);

  return (
    <Form>
      {users.map(({ ethAddress, alias }) => {
        return (
          <FormSection key={ethAddress.toString()} title={<UserTitle app={app} account={ethAddress} alias={alias} />}>
            <UserTxs account={ethAddress} app={app} />
          </FormSection>
        );
      })}
    </Form>
  );
};
