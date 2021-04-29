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
  TextLink,
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
  onForgotAlias(): void;
  isNewAccount: boolean;
  isNewAlias: boolean;
}

export const AliasForm: React.FunctionComponent<AliasFormProps> = ({
  alias,
  aliasAvailability,
  allowToProceed,
  setAlias,
  onSubmit,
  onRestart,
  onForgotAlias,
  isNewAccount,
  isNewAlias,
}) => {
  if (!allowToProceed) {
    return <Button theme="white" text="Try Again" onClick={onRestart} />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (!isNewAlias || aliasAvailability !== ValueAvailability.PENDING)) {
      onSubmit(alias);
    }
  };

  return (
    <Root>
      <InputPaddedBlock>
        <AliasInputWrapper theme={InputTheme.LIGHT}>
          {isNewAlias && (
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
          text={isNewAlias ? 'Register' : 'Login'}
          onClick={() => onSubmit(alias)}
          disabled={isNewAlias && aliasAvailability !== ValueAvailability.VALID}
        />
      </PaddedBlock>
      {!isNewAccount && !isNewAlias && (
        <PaddedBlock>
          <TextLink text="(Forgot Username)" onClick={onForgotAlias} color="white" size="xxs" italic />
        </PaddedBlock>
      )}
    </Root>
  );
};
