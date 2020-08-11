import React, { useEffect } from 'react';
import { App } from '../app';
import { Form, FormSection } from '../components';
import { LatestRollups } from './latest_rollups';
import { LatestTxs } from './latest_txs';
import { SdkEvent, SdkInitState } from 'aztec2-sdk';
import { Block, Text } from '@aztec/guacamole-ui';

interface GlobalStateProps {
  app: App;
}

export const GlobalState = ({ app }: GlobalStateProps) => {
  const initState = app.getInitState();

  useEffect(() => {
    if (initState !== SdkInitState.INITIALIZED) {
      return;
    }

    app.startTrackingGlobalState();

    return () => {
      app.stopTrackingGlobalState();
    };
  }, [app]);

  if (initState !== SdkInitState.INITIALIZED) {
    return (
      <Form>
        <Block padding="m" align="center">
          <Text text="Initialize the app to explore the rollups." />
        </Block>
      </Form>
    );
  }

  return (
    <Form>
      <FormSection title="Latest Transactions">
        <LatestTxs
          bindSetter={setter => app.on(SdkEvent.UPDATED_EXPLORER_TXS, setter)}
          unbindSetter={setter => app.off(SdkEvent.UPDATED_EXPLORER_TXS, setter)}
          explorer={app}
        />
      </FormSection>
      <FormSection title="Latest Rollups">
        <LatestRollups
          bindSetter={setter => app.on(SdkEvent.UPDATED_EXPLORER_ROLLUPS, setter)}
          unbindSetter={setter => app.off(SdkEvent.UPDATED_EXPLORER_ROLLUPS, setter)}
          explorer={app}
        />
      </FormSection>
    </Form>
  );
};
