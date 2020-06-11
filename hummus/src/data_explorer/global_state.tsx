import React, { useEffect } from 'react';
import { App, AppEvent } from '../app';
import { Form, FormSection } from '../components';
import { LatestRollups } from './latest_rollups';
import { LatestTxs } from './latest_txs';

interface GlobalStateProps {
  app: App;
}

export const GlobalState = ({ app }: GlobalStateProps) => {
  useEffect(() => {
    app.startTrackingGlobalState();

    return () => {
      app.stopTrackingGlobalState();
    };
  }, [app]);

  return (
    <Form>
      <FormSection title="Latest Transactions">
        <LatestTxs
          bindSetter={setter => app.on(AppEvent.UPDATED_TXS, setter)}
          unbindSetter={setter => app.off(AppEvent.UPDATED_TXS, setter)}
          initialData={app.getLatestTxs()}
        />
      </FormSection>
      <FormSection title="Latest Rollups">
        <LatestRollups
          bindSetter={setter => app.on(AppEvent.UPDATED_ROLLUPS, setter)}
          unbindSetter={setter => app.off(AppEvent.UPDATED_ROLLUPS, setter)}
          initialData={app.getLatestRollups()}
        />
      </FormSection>
    </Form>
  );
};
