import React, { useState } from 'react';
import { App } from '../app';

interface BalanceProps {
  app: App;
}

export default function Balance({ app }: BalanceProps) {
  const [bindListener, setBindListener] = useState(false);
  const [balance, setBalance] = useState(0);

  if (!bindListener) {
    setBindListener(true);
    setBalance(app.getBalance());
    const listener = () => {
      setBalance(app.getBalance());
    };
    app.on('updated', listener);
  }

  return <span>{balance}</span>;
}
