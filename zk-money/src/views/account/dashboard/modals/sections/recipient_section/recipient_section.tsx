import { MessageType, RecipientInput, SendMode, ValueAvailability } from 'app';
import { BorderBox, InputTheme, BlockTitle, InputWrapper, InputStatusIcon, MaskedInput, InputStatus } from 'components';
import style from './recipient_section.module.scss';

interface RecipientSectionProps {
  theme: InputTheme;
  sendMode: SendMode;
  message?: string;
  recipient: RecipientInput;
  onChangeValue: (value: string) => void;
}

const getRecipientInputStatus = (recipient: RecipientInput) => {
  if (recipient.messageType === MessageType.WARNING) {
    return InputStatus.WARNING;
  }
  if (recipient.value.valid === ValueAvailability.PENDING) {
    return InputStatus.LOADING;
  }
  return (recipient.value.input || recipient.message) && recipient.value.valid === ValueAvailability.INVALID
    ? InputStatus.ERROR
    : InputStatus.SUCCESS;
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
  const { theme, recipient, sendMode, onChangeValue } = props;

  return (
    <BorderBox area="recipient">
      <div className={style.content}>
        <BlockTitle title="Recipient" />
        <InputWrapper className={style.recipientInput} theme={theme}>
          <InputStatusIcon
            status={getRecipientInputStatus(recipient)}
            inactive={!recipient.value.input && !recipient.message}
          />
          <MaskedInput
            theme={theme}
            value={recipient.value.input}
            prefix={sendMode === SendMode.WIDTHDRAW ? '' : '@'}
            onChangeValue={onChangeValue}
            placeholder={getRecipientPlaceholder(sendMode)}
          />
        </InputWrapper>
        <span className={style.errorMessage}>{props.message}</span>
      </div>
    </BorderBox>
  );
}
