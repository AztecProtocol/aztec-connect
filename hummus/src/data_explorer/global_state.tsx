import React, { useEffect } from 'react';
import { App } from '../app';
import { Form, FormSection } from '../components';
import { LatestRollups } from './latest_rollups';
import { LatestTxs } from './latest_txs';
import { SdkEvent } from 'aztec2-sdk';

interface GlobalStateProps {
  app: App;
}

export const GlobalState = ({ app }: GlobalStateProps) => {
  const sdk = app.getSdk();

  useEffect(() => {
    sdk.startTrackingGlobalState();

    return () => {
      sdk.stopTrackingGlobalState();
    };
  }, [app]);

  return (
    <Form>
      <FormSection title="Latest Rollups">
        <LatestRollups
          bindSetter={setter => sdk.on(SdkEvent.UPDATED_EXPLORER_ROLLUPS, setter)}
          unbindSetter={setter => sdk.off(SdkEvent.UPDATED_EXPLORER_ROLLUPS, setter)}
          sdk={sdk}
        />
      </FormSection>
      <FormSection title="Latest Transactions">
        <LatestTxs
          bindSetter={setter => sdk.on(SdkEvent.UPDATED_EXPLORER_TXS, setter)}
          unbindSetter={setter => sdk.off(SdkEvent.UPDATED_EXPLORER_TXS, setter)}
          sdk={sdk}
        />
      </FormSection>
    </Form>
  );
};
