import React from 'react';
import styled from 'styled-components/macro';
import { LoginMode, ValueAvailability } from '../../app';
import {
  Button,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  MaskedInput,
  PaddedBlock,
  Text,
  TextLink,
} from '../../components';
import { spacings } from '../../styles';
import { getUrlFromLoginMode } from '../views';

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

const Description = styled.div`
  padding-top: ${spacings.s};
  text-align: center;
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
                !!alias && aliasAvailability === ValueAvailability.INVALID
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
          text={isNewAlias ? 'Register' : 'Log in'}
          onClick={() => onSubmit(alias)}
          disabled={isNewAlias && aliasAvailability !== ValueAvailability.VALID}
        />
      </PaddedBlock>
      {!isNewAccount && !isNewAlias && (
        <PaddedBlock>
          <TextLink text="(Forgot Alias)" onClick={onForgotAlias} color="white" size="xxs" italic />
        </PaddedBlock>
      )}
      {isNewAccount && !!alias && aliasAvailability === ValueAvailability.INVALID && (
        <Description>
          <Text size="xs" inline>
            {
              'This alias has been taken. If you own this alias please change to the wallet that was used to register it and '
            }
            <TextLink
              text="Log in"
              color="white"
              size="xs"
              weight="bold"
              to={getUrlFromLoginMode(LoginMode.LOGIN)}
              inline
              underline
            />
            {'.'}
          </Text>
        </Description>
      )}
    </Root>
  );
};
