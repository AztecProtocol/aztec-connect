import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { App, AppInitState, AppEvent } from '../app';
import { Form, FormSection } from '../components';
import { ThemeContext } from '../config/context';
import { UserTxs } from './user_txs';
export * from './global_state';
export * from './rollup_details';
export * from './tx_details';

interface DataExplorerProps {
  app: App;
}

export const LocalState = ({ app }: DataExplorerProps) => {
  const [initState, setInitState] = useState(app.getInitState());
  const [users, setUsers] = useState(app.getUsers());

  useEffect(() => {
    const handleInitStateUpdated = (state: AppInitState) => {
      if (state === AppInitState.INITIALIZED) {
        setUsers(app.getUsers());
      }
      setInitState(state);
    };
    app.on(AppEvent.INIT, handleInitStateUpdated);
    app.on(AppEvent.UPDATED_USERS, setUsers);

    return () => {
      app.off(AppEvent.INIT, handleInitStateUpdated);
      app.off(AppEvent.UPDATED_USERS, setUsers);
    };
  }, [app]);

  if (initState === AppInitState.UNINITIALIZED) {
    return (
      <Form>
        <Block padding="m" align="center">
          <Text text="Initialize the app to view the transactions." />
          <Block top="l">
            <ThemeContext.Consumer>
              {({ link }) => (
                <TextButton theme="underline" text="Go to initialization page >" href="/" color={link} Link={Link} />
              )}
            </ThemeContext.Consumer>
          </Block>
        </Block>
      </Form>
    );
  }

  if (initState === AppInitState.INITIALIZING) {
    return (
      <Form>
        <Block padding="m" align="center">
          <Text text="Initializing the app..." />
        </Block>
      </Form>
    );
  }

  const currentProof = app.getCurrentProof();

  return (
    <Form>
      {users.map(({ id, publicKey, alias }) => {
        return (
          <FormSection key={id} title={alias || `Account: 0x${publicKey.toString('hex').slice(0, 10)}`}>
            <UserTxs
              userId={id}
              bindSetter={setter => app.on(AppEvent.UPDATED_USER_TXS, setter)}
              unbindSetter={setter => app.off(AppEvent.UPDATED_USER_TXS, setter)}
              initialData={app.getUserTxs(id)}
              bindProofSetter={setter => app.on(AppEvent.PROOF, setter)}
              unbindProofSetter={setter => app.off(AppEvent.PROOF, setter)}
              initialProof={
                currentProof && currentProof.input && currentProof.input.userId === id ? currentProof : undefined
              }
              getTxs={() => app.getUserTxs(id)}
            />
          </FormSection>
        );
      })}
    </Form>
  );
};
