import { SendMode } from 'app';
import { InputTheme, InputWrapper, InputStatusIcon, MaskedInput, InputStatus } from 'components';
import { InputSection } from '../input_section';

interface RecipientSectionProps {
  theme: InputTheme;
  sendMode: SendMode;
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

function getRecipientPlaceholder(sendMode: SendMode) {
  switch (sendMode) {
    case SendMode.SEND:
      return `Enter Alias`;
    case SendMode.WIDTHDRAW:
      return `Enter Ethereum Address`;
    default:
      return '';
  }
}

export function RecipientSection(props: RecipientSectionProps) {
  const { sendMode, onChangeValue, theme } = props;

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
            prefix={sendMode === SendMode.WIDTHDRAW ? '' : '@'}
            onChangeValue={onChangeValue}
            placeholder={getRecipientPlaceholder(sendMode)}
          />
        </InputWrapper>
      }
      errorMessage={props.message}
    />
  );
}
