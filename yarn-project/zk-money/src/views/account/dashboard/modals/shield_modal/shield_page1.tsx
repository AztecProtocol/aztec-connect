import { TxSettlementTime } from '@aztec/sdk';
import type {
  ShieldFormFeedback,
  ShieldFormFields,
  ShieldFormValidationResult,
} from '../../../../../alt-model/shield/index.js';
import type { StrOrMax } from '../../../../../alt-model/forms/constants.js';
import { TxGasSection, RecipientSection } from '../../../../../views/account/dashboard/modals/sections/index.js';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section/index.js';
import { SplitSection } from '../sections/split_section/index.js';
import { ShieldPrivacySection } from './shield_privacy_section/index.js';
import { FooterSection } from '../sections/footer_section/index.js';
import { AmountSelection } from '../../../../../components/index.js';
import { useAccountStateManager } from '../../../../../alt-model/top_level_context/index.js';
import { useObs } from '../../../../../app/util/index.js';
import { useCachedAlias } from '../../../../../alt-model/alias_hooks.js';
import style from './shield.module.scss';

interface ShieldPage1Props {
  fields: ShieldFormFields;
  feedback: ShieldFormFeedback;
  validationResult: ShieldFormValidationResult;
  onNext(): void;
  onChangeAmountStrOrMax(value: StrOrMax): void;
  onChangeRecipientAlias(value: string): void;
  onChangeSpeed(speed: TxSettlementTime): void;
  onChangeAsset(asset: number): void;
}

function getRecipientMessage(isShieldingToHimself: boolean, aliasNotSettled: boolean) {
  if (isShieldingToHimself) {
    return aliasNotSettled
      ? `Your alias hasn't settled yet, please shield funds using your Aztec Account Address instead.`
      : 'You will be the recipient of this transaction.';
  }
  return '';
}

export function ShieldPage1({
  fields,
  feedback,
  validationResult,
  onNext,
  onChangeAmountStrOrMax,
  onChangeRecipientAlias,
  onChangeSpeed,
  onChangeAsset,
}: ShieldPage1Props) {
  const asset = validationResult.input.targetAsset;
  const accountStateManager = useAccountStateManager();
  const accountState = useObs(accountStateManager.stateObs);
  const cachedAlias = useCachedAlias();

  if (!asset) {
    return <>Loading...</>;
  }

  const footerFeedback = `${feedback.walletAccount ? feedback.walletAccount + '. ' : ''}${feedback.footer || ''}`;
  const hasWrittenRecipient = fields.recipientAlias.length > 0;
  const recipientWasFound = !!validationResult.input.recipientUserId;
  const isShieldingToHimself =
    hasWrittenRecipient &&
    (fields.recipientAlias === accountState?.userId.toString() || fields.recipientAlias === cachedAlias);
  const aliasNotSettled = !recipientWasFound && isShieldingToHimself;

  return (
    <div className={style.contentWrapper}>
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              recipientType="L2"
              recipientStr={fields.recipientAlias}
              message={getRecipientMessage(isShieldingToHimself, aliasNotSettled)}
              isLoading={validationResult.input.isLoadingRecipientUserId}
              isValid={recipientWasFound}
              onChangeValue={onChangeRecipientAlias}
            />
            <AmountSelection
              maxAmount={validationResult.maxL2Output ?? 0n}
              asset={asset}
              amountStringOrMax={fields.amountStrOrMax}
              allowAssetSelection={true}
              allowWalletSelection={true}
              onChangeAsset={onChangeAsset}
              onChangeAmountStringOrMax={onChangeAmountStrOrMax}
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
            asset={asset}
            feeAmounts={validationResult.input.feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={fields.speed} />}
      />
      <FooterSection onNext={onNext} nextDisabled={!validationResult.isValid} feedback={footerFeedback} />
    </div>
  );
}
