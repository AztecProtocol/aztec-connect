import { useContext, useEffect, useState } from 'react';
import { useSdk } from '../../../../../../alt-model/top_level_context/index.js';
import { useWalletInteractionIsOngoing } from '../../../../../../alt-model/wallet_interaction_hooks.js';
import { Field, FieldStatus } from '../../../../../../ui-components/index.js';
import { getPrefixFromRecipient, removePrefixFromRecipient } from './helpers.js';
import copy from '../../../../../../ui-components/images/copy.svg';
import { GrumpkinAddress } from '@aztec/sdk';
import { TopLevelContext } from '../../../../../../alt-model/top_level_context/top_level_context.js';
import style from './recipient_section.module.scss';

type RecipientType = 'L1' | 'L2';

interface RecipientSectionProps {
  recipientType: RecipientType;
  message?: string;
  recipientStr: string;
  isLoading: boolean;
  isValid: boolean;
  hasWarning?: boolean;
  onChangeValue: (value: string) => void;
}

function getRecipientPlaceholder(type: RecipientType) {
  switch (type) {
    case 'L2':
      return `Enter Alias or Aztec Address`;
    case 'L1':
      return `Enter Ethereum Address`;
    default:
      return '';
  }
}

function getSubtitle(type: RecipientType) {
  switch (type) {
    case 'L2':
      return 'Remember, aliases are case sensitive';
    default:
      return '';
  }
}

function Message({ message, publicKey }: { message?: string; publicKey?: GrumpkinAddress }) {
  const { toastsObs } = useContext(TopLevelContext);

  if (message && message?.length > 0) return <>{message}</>;

  if (publicKey) {
    return (
      <div
        className={style.address}
        onClick={() => {
          navigator.clipboard.writeText(`aztec:${publicKey.toString()}`);
          toastsObs.addToast({
            text: 'Address copied to clipboard',
            autocloseInMs: 5e3,
            closable: true,
          });
        }}
      >
        Account address: aztec:{publicKey.toShortString()} <img className={style.copy} alt="copy" src={copy} />
      </div>
    );
  }

  return null;
}

const getRecipientInputStatus = (isLoading: boolean, isValid: boolean, hasWarning: boolean) => {
  if (isLoading) return FieldStatus.Loading;
  if (hasWarning) return FieldStatus.Warning;
  if (isValid) return FieldStatus.Success;
  return FieldStatus.Error;
};

export function RecipientSection(props: RecipientSectionProps) {
  const { recipientType, onChangeValue } = props;
  const [publicKey, setPublicKey] = useState<GrumpkinAddress | undefined>(undefined);
  const sdk = useSdk();
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const status = getRecipientInputStatus(props.isLoading, props.isValid, !!props.hasWarning);

  const handleValueChange = (value: string) => {
    const recipient = removePrefixFromRecipient(value);
    onChangeValue(recipient);
  };

  useEffect(() => {
    if (!sdk || recipientType !== 'L2' || props.recipientStr === '') {
      setPublicKey(undefined);
      return;
    }

    (async () => {
      const pK = await sdk.getAccountPublicKey(props.recipientStr);
      setPublicKey(pK);
    })();
  }, [sdk, props.recipientStr, recipientType]);

  return (
    <Field
      label={'Recipient'}
      sublabel={getSubtitle(recipientType)}
      disabled={walletInteractionIsOngoing}
      message={<Message message={props.message} publicKey={publicKey} />}
      value={props.recipientStr}
      status={status}
      placeholder={getRecipientPlaceholder(recipientType)}
      prefix={getPrefixFromRecipient(recipientType, props.recipientStr)}
      onChangeValue={(value: string) => handleValueChange(value)}
    />
  );
}
