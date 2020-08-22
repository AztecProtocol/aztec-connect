import React, { useState, useEffect } from 'react';
import { Form, FormSection } from '../components';
import { UserTxs } from './user_txs';
import { SdkEvent, UserData } from 'aztec2-sdk';
import { App } from '../app';

interface DataExplorerProps {
  app: App;
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
          <FormSection key={ethAddress.toString()} title={alias || `Account: ${ethAddress}`}>
            <UserTxs account={ethAddress} app={app} />
          </FormSection>
        );
      })}
    </Form>
  );
};
