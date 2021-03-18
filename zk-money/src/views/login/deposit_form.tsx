import React from 'react';
import styled from 'styled-components';
import { DepositFormValues, DepositStatus, fromBaseUnits, isValidForm, ProviderState, Wallet } from '../../app';
import {
  Button,
  Input,
  InputMessage,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  Text,
} from '../../components';
import { borderRadiuses, fontWeights, spacings } from '../../styles';
import { WalletSelect } from '../account/wallet_select';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const InputPaddedBlock = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 420px;
  padding: ${spacings.m} 0 ${spacings.l};
`;

const AmountTitleRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-bottom: ${spacings.xs};
  width: 100%;
`;

const AmountInputWrapper = styled(InputWrapper)`
  align-items: stretch;
  width: 100%;
`;

const AmountStaticInputWrapper = styled(AmountInputWrapper)`
  background: rgba(255, 255, 255, 0.1);
`;

const StaticInput = styled(Input)`
  font-weight: ${fontWeights.normal};
  pointer-events: none;
`;

const AmountAssetIconRoot = styled.div`
  display: flex;
  align-items: center;
`;

const AssetIcon = styled.img`
  padding: 0 ${spacings.s};
  height: 24px;
`;

const AmountMessageRoot = styled.div`
  position: absolute;
  bottom: 0;
  transform: translateY(100%);
`;

const MaxButton = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.m};
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0 ${borderRadiuses.s} ${borderRadiuses.s} 0;
  cursor: pointer;
`;

const ButtonRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: ${spacings.s};
`;

interface DepositFormProps {
  form: DepositFormValues;
  providerState?: ProviderState;
  onChangeInputs(inputs: Partial<DepositFormValues>): void;
  onSubmit(): void;
  onChangeWallet(wallet: Wallet): void;
}

export const DepositForm: React.FunctionComponent<DepositFormProps> = ({
  providerState,
  form,
  onChangeInputs,
  onSubmit,
  onChangeWallet,
}) => {
  const {
    submit, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...formInputs
  } = form;
  const {
    asset: { value: asset },
    amount,
    maxAmount,
    minAmount,
    ethAccount,
    status,
  } = formInputs;
  const { pendingBalance } = ethAccount.value;
  const claimEnabled = pendingBalance >= minAmount.value;

  return (
    <Root>
      <InputPaddedBlock>
        <AmountTitleRoot>
          <WalletSelect
            asset={asset}
            providerState={providerState}
            ethAccount={ethAccount.value}
            message={ethAccount.message}
            messageType={ethAccount.messageType}
            onChangeWallet={onChangeWallet}
          />
        </AmountTitleRoot>
        {claimEnabled ? (
          <AmountStaticInputWrapper theme={InputTheme.LIGHT}>
            <AmountAssetIconRoot>
              <InputStatusIcon status={InputStatus.SUCCESS} />
            </AmountAssetIconRoot>
            <StaticInput
              theme={InputTheme.LIGHT}
              value={`${fromBaseUnits(pendingBalance, asset.decimals)} ${asset.symbol}`}
            />
          </AmountStaticInputWrapper>
        ) : (
          <AmountInputWrapper theme={InputTheme.LIGHT}>
            <AmountAssetIconRoot>
              <AssetIcon src={asset.iconWhite} />
            </AmountAssetIconRoot>
            <Input
              theme={InputTheme.LIGHT}
              value={amount.value}
              onChangeValue={value => onChangeInputs({ amount: { value } })}
            />
            <MaxButton
              onClick={() => onChangeInputs({ amount: { value: fromBaseUnits(maxAmount.value, asset.decimals) } })}
            >
              <Text text="MAX" size="xs" />
            </MaxButton>
            {amount.message && (
              <AmountMessageRoot>
                <InputMessage theme={InputTheme.LIGHT} message={amount.message} type={amount.messageType} />
              </AmountMessageRoot>
            )}
          </AmountInputWrapper>
        )}
      </InputPaddedBlock>
      <ButtonRoot>
        <Button
          theme="white"
          text={claimEnabled ? 'Claim Username' : 'Deposit'}
          onClick={onSubmit}
          disabled={!isValidForm(formInputs as any) || status.value > DepositStatus.VALIDATE}
          isLoading={status.value === DepositStatus.VALIDATE}
        />
      </ButtonRoot>
    </Root>
  );
};
