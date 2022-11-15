import { EthAddress, GrumpkinAddress } from '@aztec/sdk';
import { ImageButton, ImageButtonIcon } from '../../ui-components/index.js';
import { bindStyle } from '../../ui-components/util/classnames.js';
import { formatEthAddress } from '../../app/util/helpers.js';
import { KeyType, PhaseType } from '../../views/account/dashboard/register_account_form.js';
import style from './key_generation_input.module.scss';

const cx = bindStyle(style);
export interface KeyGenerationInputValue {
  generatorEthAddress: EthAddress;
  publicKey: GrumpkinAddress;
}

export interface KeyGenerationResult extends KeyGenerationInputValue {
  privateKey?: Buffer;
}
interface KeyGenerationInputProps {
  keyType: KeyType;
  accountKeys: KeyGenerationInputValue | null;
  disabled?: boolean;
  onSetPhase: (phase: PhaseType) => void;
  onSetKeyType: (keyType: KeyType) => void;
}

function getIcon(keyType: KeyType) {
  if (keyType === 'spending') {
    return ImageButtonIcon.Key;
  }
  return ImageButtonIcon.Wallet;
}

function getText(keyType: KeyType, checked: boolean) {
  if (checked) {
    return keyType === 'account' ? 'Aztec Address' : 'Spending Key';
  }
  return keyType === 'account' ? 'Retrieve\nAztec Address' : 'Retrieve\nSpending Key';
}

export function KeyGenerationInput(props: KeyGenerationInputProps) {
  const { disabled, keyType, accountKeys, onSetPhase, onSetKeyType } = props;

  const generatorEthAddress = accountKeys?.generatorEthAddress;
  const checked = !!accountKeys?.publicKey;

  const handleClickButton = () => {
    onSetPhase('signer-select');
    onSetKeyType(keyType);
  };

  return (
    <div className={cx(style.root, keyType === 'spending' && style.spending)}>
      <ImageButton
        disabled={disabled}
        checked={checked}
        icon={getIcon(keyType)}
        label={getText(keyType, checked)}
        onClick={handleClickButton}
        sublabel={generatorEthAddress ? `Retrieved from ${formatEthAddress(generatorEthAddress)}` : ''}
      />
    </div>
  );
}
