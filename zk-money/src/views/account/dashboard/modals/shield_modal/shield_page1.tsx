import type { ShieldFormFeedback, ShieldFormFields, ShieldFormValidationResult } from 'alt-model/shield';
import type { StrOrMax } from 'alt-model/forms/constants';
import { TxSettlementTime } from '@aztec/sdk';
import { ProviderStatus, WalletId } from 'app';
import { InputTheme } from 'components';
import { AmountSection, TxGasSection, RecipientSection } from 'views/account/dashboard/modals/sections';
import { RemoteAsset } from 'alt-model/types';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { SplitSection } from '../sections/split_section';
import { useProviderState } from 'alt-model';
import { useLegacyEthAccountState } from 'alt-model/assets/l1_balance_hooks';
import { WalletDropdownSelect } from '../defi_modal/wallet_dropdown_select';
import { WalletAccountIndicator } from 'ui-components';
import style from './shield.module.scss';
import { ShieldPrivacySection } from './shield_privacy_section';
import { FooterSection } from '../sections/footer_section';

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
  const address = providerState?.account;
  const walletId = providerState?.walletId;

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

  if (isWalletDisconnected) {
    return (
      <div className={style.errorAlert}>
        <WalletDropdownSelect />
        <div className={style.connectLabel}>
          {feedback.walletAccount ??
            (isProviderSwitching ? 'Swiching provider, please wait...' : 'Please connect a wallet to shield')}
        </div>
      </div>
    );
  }

  return (
    <div className={style.contentWrapper}>
      <WalletAccountIndicator
        className={style.walletAccountIndicator}
        address={address?.toString() ?? ''}
        wallet={walletId === WalletId.METAMASK ? 'metamask' : 'wallet-connect'}
      />
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={InputTheme.WHITE}
              recipientType="L2"
              recipientStr={fields.recipientAlias}
              isLoading={validationResult.input.aliasIsValid === undefined}
              isValid={!!validationResult.input.aliasIsValid}
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
        rightPanel={<ShieldPrivacySection />}
      />
      <SplitSection
        leftPanel={
          <TxGasSection
            balanceType={validationResult.targetAssetIsPayingFee ? 'L1' : 'L2'}
            speed={fields.speed}
            onChangeSpeed={onChangeSpeed}
            feeAmounts={validationResult.input.feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
            deductionIsFromL1={validationResult.targetAssetIsPayingFee}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={fields.speed} />}
      />
      <FooterSection onNext={onNext} nextDisabled={!validationResult.isValid} feedback={feedback.footer} />
    </div>
  );
}
