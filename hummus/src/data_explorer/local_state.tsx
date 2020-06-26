import React, { useState, useEffect } from 'react';
import { Block, Text } from '@aztec/guacamole-ui';
import { App } from '../app';
import { Form, FormSection } from '../components';
import { UserTxs } from './user_txs';
import { SdkEvent, SdkInitState } from 'aztec2-sdk';

interface DataExplorerProps {
  app: App;
}

export const LocalState = ({ app }: DataExplorerProps) => {
  const [initState, setInitState] = useState(app.getInitState());
  const [users, setUsers] = useState(app.getUsers());

  useEffect(() => {
    const handleInitStateUpdated = (state: SdkInitState) => {
      if (state === SdkInitState.INITIALIZED) {
        setUsers(app.getUsers());
      }
      setInitState(state);
    };

    handleInitStateUpdated(app.getInitState());

    app.on(SdkEvent.UPDATED_INIT_STATE, handleInitStateUpdated);
    app.on(SdkEvent.UPDATED_USERS, setUsers);

    return () => {
      app.off(SdkEvent.UPDATED_INIT_STATE, handleInitStateUpdated);
      app.off(SdkEvent.UPDATED_USERS, setUsers);
    };
  }, [app]);

  if (initState !== SdkInitState.INITIALIZED) {
    return (
      <Form>
        <Block padding="m" align="center">
          <Text text="Initialize the app to view the transactions." />
        </Block>
      </Form>
    );
  }

  return (
    <Form>
      {users.map(({ id, publicKey, alias }) => {
        return (
          <FormSection key={id} title={alias || `Account: 0x${publicKey.toString('hex').slice(0, 10)}`}>
            <UserTxs userId={id} app={app} />
          </FormSection>
        );
      })}
    </Form>
  );
};
