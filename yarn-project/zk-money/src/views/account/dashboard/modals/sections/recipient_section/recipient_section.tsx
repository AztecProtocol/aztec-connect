import { useWalletInteractionIsOngoing } from '../../../../../../alt-model/wallet_interaction_hooks.js';
import { Field, FieldStatus } from '../../../../../../ui-components/index.js';
import { getPrefixFromRecipient, removePrefixFromRecipient } from './helpers.js';

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

const getRecipientInputStatus = (isLoading: boolean, isValid: boolean, hasWarning: boolean) => {
  if (isLoading) return FieldStatus.Loading;
  if (hasWarning) return FieldStatus.Warning;
  if (isValid) return FieldStatus.Success;
  return FieldStatus.Error;
};

export function RecipientSection(props: RecipientSectionProps) {
  const { recipientType, onChangeValue } = props;
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const status = getRecipientInputStatus(props.isLoading, props.isValid, !!props.hasWarning);

  const handleValueChange = (value: string) => {
    const recipient = removePrefixFromRecipient(value);
    onChangeValue(recipient);
  };

  return (
    <Field
      label={'Recipient'}
      disabled={walletInteractionIsOngoing}
      message={props.message}
      value={props.recipientStr}
      status={status}
      placeholder={getRecipientPlaceholder(recipientType)}
      prefix={getPrefixFromRecipient(recipientType, props.recipientStr)}
      onChangeValue={(value: string) => handleValueChange(value.toLowerCase())}
    />
  );
}
