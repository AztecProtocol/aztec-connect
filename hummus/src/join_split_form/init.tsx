import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';

interface InitProps {
  initialServerUrl?: string;
  onSubmit: (serverUrl: string) => void;
  isLoading: boolean;
}

export const Init = ({ initialServerUrl = '', onSubmit, isLoading }: InitProps) => {
  const [serverUrl, setServerUrl] = useState(initialServerUrl);

  return (
    <Block padding="xs 0">
      <FormField label="Server url">
        <Input value={serverUrl} onChange={setServerUrl} />
      </FormField>
      <FormField label="Press the button">
        <Button text="The Button" onSubmit={() => onSubmit(serverUrl)} isLoading={isLoading} />
      </FormField>
    </Block>
  );
};
