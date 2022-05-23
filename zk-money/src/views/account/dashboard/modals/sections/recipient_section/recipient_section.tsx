import { InputTheme, InputWrapper, InputStatusIcon, MaskedInput, InputStatus } from 'components';
import { InputSection } from '../input_section';

type RecipientType = 'L1' | 'L2';

interface RecipientSectionProps {
  theme: InputTheme;
  recipientType: RecipientType;
  message?: string;
  recipientStr: string;
  isLoading: boolean;
  isValid: boolean;
  onChangeValue: (value: string) => void;
}

const getRecipientInputStatus = (isLoading: boolean, isValid: boolean) => {
  if (isLoading) return InputStatus.LOADING;
  if (isValid) return InputStatus.SUCCESS;
  return InputStatus.ERROR;
  // TODO: Support warning state - probably if reusing an eth address?
};

function getRecipientPlaceholder(type: RecipientType) {
  switch (type) {
    case 'L2':
      return `Enter Alias`;
    case 'L1':
      return `Enter Ethereum Address`;
    default:
      return '';
  }
}

export function RecipientSection(props: RecipientSectionProps) {
  const { recipientType, onChangeValue, theme } = props;

  return (
    <InputSection
      title={'Recipient'}
      component={
        <InputWrapper theme={theme}>
          <InputStatusIcon
            status={getRecipientInputStatus(props.isLoading, props.isValid)}
            // TODO: why would we want an inactive state?
            inactive={props.recipientStr.length === 0}
          />
          <MaskedInput
            theme={theme}
            value={props.recipientStr}
            prefix={recipientType === 'L1' ? '' : '@'}
            onChangeValue={onChangeValue}
            placeholder={getRecipientPlaceholder(recipientType)}
          />
        </InputWrapper>
      }
      errorMessage={props.message}
    />
  );
}
