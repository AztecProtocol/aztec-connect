import type {
  ShieldFormFeedback,
  ShieldFormFields,
  ShieldFormValidationResult,
} from '../../../../../alt-model/shield/index.js';
import type { StrOrMax } from '../../../../../alt-model/forms/constants.js';
import { TxSettlementTime } from '@aztec/sdk';
import { useState } from 'react';
import { WalletId, wallets } from '../../../../../app/index.js';
import { InputTheme, WalletAccountIndicator } from '../../../../../components/index.js';
import {
  AmountSection,
  TxGasSection,
  RecipientSection,
} from '../../../../../views/account/dashboard/modals/sections/index.js';
import { RemoteAsset } from '../../../../../alt-model/types.js';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section/index.js';
import { SplitSection } from '../sections/split_section/index.js';
import { useProviderState, useApp } from '../../../../../alt-model/index.js';
import { ShieldPrivacySection } from './shield_privacy_section/index.js';
import { FooterSection } from '../sections/footer_section/index.js';
import style from './shield.module.scss';

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
  const { userSession, provider } = useApp();

  const providerState = useProviderState();
  const asset = validationResult.input.targetAsset;
  const address = providerState?.account;
  const walletId = providerState?.walletId;
  const [isWalletSelectorOpen, setWalletSelectorOpen] = useState(false);

  if (!asset) {
    return <>Loading...</>;
  }

  const toggleWalletDropdown = () => {
    setWalletSelectorOpen(prevValue => !prevValue);
  };

  const options = (window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK)).map(wallet => ({
    value: wallet.id,
    label: wallet.nameShort,
  }));

  return (
    <div className={style.contentWrapper}>
      <WalletAccountIndicator
        className={style.walletAccountIndicator}
        address={address?.toString() ?? ''}
        walletId={walletId as WalletId}
        options={options}
        onClick={toggleWalletDropdown}
        onChange={async id => {
          await provider?.disconnect();
          userSession?.changeWallet(id, true);
        }}
        onClose={toggleWalletDropdown}
        isOpen={isWalletSelectorOpen}
      />
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={InputTheme.WHITE}
              recipientType="L2"
              recipientStr={fields.recipientAlias}
              isLoading={validationResult.input.isLoadingRecipientUserId}
              isValid={!!validationResult.input.recipientUserId}
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
