import { DropdownType, Select } from '../../index.js';
import { bindStyle } from '../../util/classnames.js';
import successIcon from '../../images/success.svg';
import errorIcon from '../../images/error.svg';
import warningIcon from '../../images/warning.svg';
import style from './fee_selector.module.scss';

const cx = bindStyle(style);

type SomeId = string | number;

export enum FeeSelectorStatus {
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

interface FeeOption {
  label: string;
  timeStr?: string;
  feeAmountStr?: string;
  feeBulkPriceStr?: string;
}

export interface RadioButtonOption<TId extends SomeId> {
  id: TId;
  content: FeeOption;
}

interface FeeSelectorProps<TId extends SomeId> {
  label: string;
  options: RadioButtonOption<TId>[];
  value: TId | null;
  sublabel?: string;
  placeholder?: string;
  disabled?: boolean;
  balance?: string;
  status?: FeeSelectorStatus;
  onChangeValue: (value: TId) => void;
}

function renderStatusIcon(status?: FeeSelectorStatus) {
  switch (status) {
    case FeeSelectorStatus.Error:
      return <img className={style.icon} alt="Error" src={errorIcon} />;
    case FeeSelectorStatus.Warning:
      return <img className={style.icon} alt="Warning" src={warningIcon} />;
    case FeeSelectorStatus.Success:
      return <img className={style.icon} alt="Success" src={successIcon} />;
  }
  return null;
}

export function FeeSelector<TId extends SomeId>(props: FeeSelectorProps<TId>) {
  return (
    <div className={style.content}>
      {props.label && (
        <div className={style.header}>
          <div className={style.title}>
            {props.label}
            {props.sublabel && (
              <div className={cx(style.subtitle, props.balance && style.hasBalance)}>{props.sublabel}</div>
            )}
          </div>
        </div>
      )}
      <div className={style.input}>
        <Select
          className={cx(
            style.inputInner,
            props.status === FeeSelectorStatus.Success && style.success,
            props.status === FeeSelectorStatus.Error && style.error,
            props.status === FeeSelectorStatus.Warning && style.warning,
          )}
          placeholder={props.placeholder}
          disabled={props.disabled}
          dropdownType={DropdownType.Fees}
          value={props.value}
          options={props.options.map(option => ({
            value: option.id,
            label: `${option.content.label}${option.content.timeStr ? ` (${option.content.timeStr})` : ``}`,
            sublabel: `${option.content.feeAmountStr || '-'}${
              option.content.feeBulkPriceStr ? ` (${option.content.feeBulkPriceStr})` : ``
            }`,
          }))}
          onChange={value => (!!value || value === 0) && props.onChangeValue(value)}
        />
        {renderStatusIcon(props.status)}
      </div>
    </div>
  );
}
