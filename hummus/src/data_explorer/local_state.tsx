import { Block, FlexBox, TextButton } from '@aztec/guacamole-ui';
import { EthUserId, SdkEvent, WebSdk } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import { Form, FormSection } from '../components';
import { UserTxs } from './user_txs';

const UserTitle = ({ app, account, alias }: { app: WebSdk; account: EthUserId; alias?: string }) => (
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
      {users.map(({ ethUserId }) => {
        return (
          <FormSection key={ethUserId.toString()} title={<UserTitle app={app} account={ethUserId} />}>
            <UserTxs account={ethUserId} app={app} />
          </FormSection>
        );
      })}
    </Form>
  );
};
