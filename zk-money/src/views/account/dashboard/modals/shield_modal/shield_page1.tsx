import type { ShieldFormFeedback, ShieldFormFields, ShieldFormValidationResult } from 'alt-model/shield';
import type { StrOrMax } from 'alt-model/forms/constants';
import { TxSettlementTime, TxType } from '@aztec/sdk';
import { ProviderStatus, SendMode, ValueAvailability } from 'app';
import { Button, InputTheme } from 'components';
import { AmountSection, TxGasSection, RecipientSection } from 'views/account/dashboard/modals/sections';
import { ConnectedLegacyWalletSelect } from './connected_legacy_wallet_select';
import { RemoteAsset } from 'alt-model/types';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { SplitSection } from '../sections/split_section';
import { useProviderState } from 'alt-model';
import { useLegacyEthAccountState } from 'alt-model/assets/l1_balance_hooks';
import style from './shield.module.scss';

function toLegacyRecipientInput({ recipientAlias }: ShieldFormFields, { input }: ShieldFormValidationResult) {
  const { aliasIsValid } = input;
  const valid =
    aliasIsValid === undefined
      ? ValueAvailability.PENDING
      : aliasIsValid
      ? ValueAvailability.VALID
      : ValueAvailability.INVALID;
  return {
    value: { input: recipientAlias, txType: TxType.DEPOSIT, valid },
  };
}

interface ShieldPage1Props {
  fields: ShieldFormFields;
  feedback: ShieldFormFeedback;
  validationResult: ShieldFormValidationResult;
  assets: RemoteAsset[];
  onNext(): void;
  onChangeAmountStrOrMax(value: StrOrMax): void;
  onChangeRecipientAlias(value: string): void;
  onChangeSpeed(speed: TxSettlementTime): void;
  onChangeAsset(asset: number): void;
}

export function ShieldPage1({
  fields,
  feedback,
  validationResult,
  assets,
  onNext,
  onChangeAmountStrOrMax,
  onChangeRecipientAlias,
  onChangeSpeed,
  onChangeAsset,
}: ShieldPage1Props) {
  const providerState = useProviderState();
  const asset = validationResult.input.targetAsset;
  const ethAccount = useLegacyEthAccountState(asset);

  if (!asset) {
    return <>Loading...</>;
  }
  const isWalletInitialising =
    providerState &&
    [ProviderStatus.DESTROYED, ProviderStatus.INITIALIZING, ProviderStatus.UNINITIALIZED].indexOf(
      providerState.status,
    ) >= 0;
  const isProviderSwitching =
    !ethAccount?.ethAddress || ethAccount.ethAddress.toString() !== providerState?.account?.toString();
  const isWalletDisconnected = feedback.walletAccount || isWalletInitialising || isProviderSwitching;

  const walletSelect = (
    <ConnectedLegacyWalletSelect className={style.walletSelect} asset={asset} errorFeedback={feedback.walletAccount} />
  );

  if (isWalletDisconnected) {
    return (
      <div className={style.errorAlert}>
        {walletSelect}
        <div className={style.connectLabel}>
          {isProviderSwitching ? 'Swiching provider, please wait...' : 'Please connect a wallet to shield'}
        </div>
      </div>
    );
  }

  return (
    <>
      {walletSelect}
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={InputTheme.WHITE}
              recipient={toLegacyRecipientInput(fields, validationResult)}
              sendMode={SendMode.SEND}
              onChangeValue={onChangeRecipientAlias}
            />
            <AmountSection
              maxAmount={validationResult.maxL2Output ?? 0n}
              asset={asset}
              assets={assets}
              amountStrOrMax={fields.amountStrOrMax}
              allowAssetSelection={true}
              onChangeAsset={onChangeAsset}
              onChangeAmountStrOrMax={onChangeAmountStrOrMax}
              hidePrivacy
              message={feedback.amount}
              balanceType="L1"
            />
          </>
        }
        rightPanel={<div />}
      />
      <SplitSection
        leftPanel={
          <TxGasSection
            asset={validationResult.input.feeAmount?.info}
            balanceType={validationResult.targetAssetIsPayingFee ? 'L1' : 'L2'}
            speed={fields.speed}
            onChangeSpeed={onChangeSpeed}
            feeAmounts={validationResult.input.feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={fields.speed} />}
      />

      {feedback.footer && <div className={style.errorMessage}>{feedback.footer}</div>}
      <div className={style.nextWrapper}>
        <Button theme="gradient" text="Next" onClick={onNext} disabled={!validationResult.isValid} />
      </div>
    </>
  );
}
