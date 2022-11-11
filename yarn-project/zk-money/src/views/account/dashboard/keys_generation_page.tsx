import createDebug from 'debug';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { AztecSdk, EthAddress, EthersAdapter } from '@aztec/sdk';
import { Signer } from '@ethersproject/abstract-signer';
import { RegisterFormFields } from '../../../alt-model/forms/register/register_form_fields.js';
import { FieldSetters } from '../../../alt-model/form_fields_hooks.js';
import { TopLevelContext } from '../../../alt-model/top_level_context/top_level_context.js';
import { useSdk } from '../../../alt-model/top_level_context/index.js';
import { formatEthAddress } from '../../../app/util/helpers.js';
import { getAccountConfirmationToast, getWalletInteractionToast } from '../../../views/toasts/toast_configurations.js';
import { KeyType, PhaseType } from './register_account_form.js';
import { KeyGenerationInput, KeyGenerationResult } from '../../../components/index.js';
import { ImageButton, ImageButtonIcon, FormWarning } from '../../../ui-components/index.js';
import { RegisterFormAssessment } from '../../../alt-model/forms/register/assess_register_form.js';
import { useAccountState } from '../../../alt-model/account_state/index.js';
import style from './keys_generation_page.module.scss';

const debug = createDebug('keys_generation_page');

interface KeysGenerationPageProps {
  fields: RegisterFormFields;
  setters: FieldSetters<RegisterFormFields>;
  assessment: RegisterFormAssessment;
  userHasDownloadedKeys: boolean;
  onDownloadKeys: (status: boolean) => void;
  onAccessAccount: (result: KeyGenerationResult | null) => void;
}

function getTitle(userHasConfirmationKey: boolean, userHasSpendingKeys: boolean) {
  if (!userHasConfirmationKey)
    return {
      title: 'Sign a message from your Ethereum wallet to retrieve your Aztec address',
      subtitle: 'Remember which Ethereum address you used to sign up!',
    };
  if (!userHasSpendingKeys)
    return {
      title: 'Sign a message to retrieve a Spending Key for your Aztec account',
      subtitle: 'You will use your Ethereum wallet for this action.',
    };
  return {
    title: 'Save your data somewhere safe but accessible',
    subtitle: `This data is not sensitive, but will help you login if you forget your details.`,
  };
}

function selectGenerator(sdk: AztecSdk, keyType: KeyType) {
  switch (keyType) {
    case 'account':
      return sdk.generateAccountKeyPair.bind(sdk);
    case 'spending':
      return sdk.generateSpendingKeyPair.bind(sdk);
  }
}

function generateTextKeys(
  aztecWalletAddress: string,
  accountKeyGeneratorAddress: EthAddress,
  spendingKeyEthAddress: EthAddress,
) {
  return `Store the following information somewhere safe but accessible:\n
  Aztec Account Address: aztec:${aztecWalletAddress}\n
  Aztec Account Generator Address: eth:${accountKeyGeneratorAddress.toString()}\n
  Spending Key Generator Address: eth:${spendingKeyEthAddress.toString()}`;
}

async function generateKeys(
  sdk: AztecSdk,
  keyType: 'account' | 'spending',
  signer: Signer,
): Promise<KeyGenerationResult> {
  const addressStr = await signer.getAddress();
  const generatorEthAddress = EthAddress.fromString(addressStr);
  const ethersAdapter = new EthersAdapter(signer.provider!);
  const { publicKey, privateKey } = await selectGenerator(sdk, keyType)(generatorEthAddress, ethersAdapter);
  //  We musn't store the spending private key in React state
  if (keyType === 'spending') return { publicKey, generatorEthAddress };
  return { publicKey, generatorEthAddress, privateKey };
}

export function KeysGenerationPage(props: KeysGenerationPageProps) {
  const { fields, setters, userHasDownloadedKeys, onAccessAccount, onDownloadKeys } = props;
  const [phase, setPhase] = useState<PhaseType>('idle');
  const [keyType, setKeyType] = useState<KeyType | undefined>(undefined);
  const { toastsObs } = useContext(TopLevelContext);
  const { walletInteractionToastsObs } = useContext(TopLevelContext);
  const { address, isConnected } = useAccount();
  const accountState = useAccountState();
  const { data: signer } = useSigner();
  const sdk = useSdk();

  const setAccountKeys = setters.accountKeys;
  const setConfirmationAccountKeys = setters.confirmationAccountKeys;
  const setSpendingKeys = setters.spendingKeys;

  const signerReady = isConnected && signer;
  const userHasSpendingKeys = !!fields.spendingKeys;
  const userHasAccountKeys = !!fields.accountKeys;
  const userHasConfirmationKeys = !!fields.confirmationAccountKeys;
  const userHasToRegister = accountState && !accountState?.isRegistered;
  const { title, subtitle } = getTitle(userHasConfirmationKeys, userHasSpendingKeys);

  const userChangedWallet = fields.accountKeys?.generatorEthAddress.toString().toLowerCase() !== address?.toLowerCase();
  const fomattedAddress = fields.accountKeys && formatEthAddress(fields.accountKeys.generatorEthAddress);
  const userChangedWalletError = userHasAccountKeys && !userHasSpendingKeys && userChangedWallet;
  const isCheckingAccountKeyStability = fields.accountKeys && !fields.confirmationAccountKeys && userHasToRegister;

  function handleCopyKeys() {
    if (fields.spendingKeys && fields.accountKeys) {
      const text = generateTextKeys(
        fields.accountKeys.publicKey.toString(),
        fields.accountKeys.generatorEthAddress,
        fields.spendingKeys.generatorEthAddress,
      );
      navigator.clipboard.writeText(text);
      onDownloadKeys(true);
      toastsObs.addToast({
        text: 'Your account information has been copied to the clipboard. This data is not privacy-revealing but please store it somewhere safe but accessible.',
        autocloseInMs: 10e3,
        closable: true,
      });
    }
  }

  const handleAccountKeyGeneration = useCallback(
    (result: KeyGenerationResult | null) => {
      onAccessAccount(result);
      setAccountKeys(result);
      onDownloadKeys(false);
    },
    [onAccessAccount, setAccountKeys, onDownloadKeys],
  );

  const handleConfirmationAccountKeyGeneration = useCallback(
    (result: KeyGenerationResult | null) => {
      setConfirmationAccountKeys(result);
      onDownloadKeys(false);
    },
    [setConfirmationAccountKeys, onDownloadKeys],
  );

  const handleSpendingKeyGeneration = useCallback(
    (result: KeyGenerationResult | null) => {
      setSpendingKeys(result);
      onDownloadKeys(false);
    },
    [setSpendingKeys, onDownloadKeys],
  );

  const handleRequestSignature = useCallback(async () => {
    if (!sdk || !signerReady || !keyType) return;
    try {
      setPhase('awaiting-signature');
      const result = await generateKeys(sdk, keyType, signer);
      if (keyType === 'account') {
        if (isCheckingAccountKeyStability) {
          handleConfirmationAccountKeyGeneration(result);
        } else {
          handleAccountKeyGeneration(result);
        }
      } else if (keyType === 'spending') {
        handleSpendingKeyGeneration(result);
      }
    } catch (err) {
      debug('Signing failed', err);
    }
    setPhase('idle');
  }, [
    isCheckingAccountKeyStability,
    handleAccountKeyGeneration,
    handleConfirmationAccountKeyGeneration,
    handleSpendingKeyGeneration,
    sdk,
    signer,
    keyType,
    signerReady,
  ]);

  useEffect(() => {
    if (isCheckingAccountKeyStability) {
      setPhase('signer-select');
    }
  }, [isCheckingAccountKeyStability]);

  useEffect(() => {
    if (isCheckingAccountKeyStability) {
      const disabled = !signerReady || userChangedWalletError;
      const toast = getAccountConfirmationToast(phase, disabled, handleRequestSignature, () => {
        setPhase('idle');
        setAccountKeys(null);
      });

      walletInteractionToastsObs.addOrReplaceToast(toast);
    }
  }, [
    userChangedWalletError,
    isCheckingAccountKeyStability,
    props.assessment.accountKey.issues.accountKeysDontMatch,
    walletInteractionToastsObs,
    signerReady,
    setPhase,
    handleRequestSignature,
    setAccountKeys,
    phase,
  ]);

  useEffect(() => {
    if (userChangedWalletError) {
      walletInteractionToastsObs.removeAllToasts();
    }
  }, [userChangedWalletError, walletInteractionToastsObs]);

  useEffect(() => () => walletInteractionToastsObs.removeAllToasts(), [walletInteractionToastsObs]);

  useEffect(() => {
    if (userChangedWalletError) return;

    if (phase !== 'signer-select' && phase !== 'awaiting-signature' && !isCheckingAccountKeyStability) {
      walletInteractionToastsObs.removeAllToasts();
      return;
    }

    if (isCheckingAccountKeyStability) return;

    walletInteractionToastsObs.addOrReplaceToast(
      getWalletInteractionToast(phase, !signerReady, handleRequestSignature, () => setPhase('idle')),
    );
  }, [
    phase,
    walletInteractionToastsObs,
    signerReady,
    setPhase,
    handleRequestSignature,
    userChangedWalletError,
    isCheckingAccountKeyStability,
  ]);

  return (
    <>
      <div className={style.message}>
        <span className={style.title}>{title}</span>
        <span className={style.subtitle}>{subtitle}</span>
      </div>
      <div className={style.buttons}>
        <KeyGenerationInput
          keyType={'account'}
          accountKeys={fields.confirmationAccountKeys}
          disabled={userHasConfirmationKeys}
          onSetPhase={setPhase}
          onSetKeyType={setKeyType}
        />
        {userHasConfirmationKeys && !props.assessment.accountKey.issues.accountKeysDontMatch && (
          <KeyGenerationInput
            keyType={'spending'}
            accountKeys={fields.spendingKeys}
            disabled={!!fields.spendingKeys || userChangedWalletError}
            onSetPhase={setPhase}
            onSetKeyType={setKeyType}
          />
        )}
        {userHasSpendingKeys && (
          <ImageButton
            icon={ImageButtonIcon.Copy}
            checked={userHasDownloadedKeys}
            label={'Copy To Clipboard'}
            disabled={!fields.accountKeys || !fields.spendingKeys}
            onClick={handleCopyKeys}
          />
        )}
      </div>
      {userChangedWalletError && (
        <FormWarning
          className={style.formWarning}
          text={`You can't use two different wallets to generate your keys for the Aztec Network. Please switch your wallet back to ${fomattedAddress}.`}
        />
      )}
      {props.assessment.accountKey.issues.accountKeysDontMatch && (
        <FormWarning
          className={style.formWarning}
          text={`Your Ethereum wallet is unable to to produce a stable Aztec address.`}
        />
      )}
    </>
  );
}
