import React from 'react';
import styled from 'styled-components';
import { ValueAvailability } from '../../app';
import {
  Button,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  MaskedInput,
  PaddedBlock,
} from '../../components';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const InputPaddedBlock = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const AliasInputWrapper = styled(InputWrapper)`
  width: 100%;
  max-width: 420px;
`;

interface AliasFormProps {
  alias: string;
  aliasAvailability: ValueAvailability;
  rememberMe: boolean;
  allowToProceed: boolean;
  setAlias: (alias: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  onSubmit: (alias: string) => void;
  onRestart(): void;
  isNewAccount: boolean;
}

export const AliasForm: React.FunctionComponent<AliasFormProps> = ({
  alias,
  aliasAvailability,
  allowToProceed,
  setAlias,
  onSubmit,
  onRestart,
  isNewAccount,
}) => {
  if (!allowToProceed) {
    return <Button theme="white" text="Try Again" onClick={onRestart} />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (!isNewAccount || aliasAvailability !== ValueAvailability.PENDING)) {
      onSubmit(alias);
    }
  };

  return (
    <Root>
      <InputPaddedBlock>
        <AliasInputWrapper theme={InputTheme.LIGHT}>
          {isNewAccount && (
            <InputStatusIcon
              status={
                aliasAvailability === ValueAvailability.INVALID && !!alias
                  ? InputStatus.ERROR
                  : aliasAvailability === ValueAvailability.PENDING
                  ? InputStatus.LOADING
                  : InputStatus.SUCCESS
              }
              inactive={!alias}
            />
          )}
          <MaskedInput
            theme={InputTheme.LIGHT}
            value={alias}
            prefix="@"
            placeholder="@montzema50"
            onChangeValue={setAlias}
            onKeyDown={handleKeyDown}
          />
        </AliasInputWrapper>
      </InputPaddedBlock>
      <PaddedBlock>
        <Button
          theme="white"
          text={isNewAccount ? 'Register' : 'Login'}
          onClick={() => onSubmit(alias)}
          disabled={isNewAccount && aliasAvailability !== ValueAvailability.VALID}
        />
      </PaddedBlock>
    </Root>
  );
};
