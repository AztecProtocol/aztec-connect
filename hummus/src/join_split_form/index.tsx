import createDebug from 'debug';
import React, { useState, useEffect } from 'react';
import { App, AppEvent } from '../app';
import { ActionForm } from './action_form';

const debug = createDebug('bb:join_split_form');

interface JoinSplitFormProps {
  app: App;
}

export const JoinSplitForm = ({ app }: JoinSplitFormProps) => {
  const [account, setAccount] = useState(app.getAccount());

  useEffect(() => {
    app.on(AppEvent.UPDATED_ACCOUNT, setAccount);

    return () => {
      app.off(AppEvent.UPDATED_ACCOUNT, setAccount);
    };
  }, [app]);

  return <ActionForm app={app} account={account} />;
};
