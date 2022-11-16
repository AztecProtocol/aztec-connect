import { bindStyle } from '../../../ui-components/util/classnames.js';
import style from './toggle.module.scss';

const cx = bindStyle(style);

interface Option<T> {
  value: T;
  label: string;
  sublabel?: React.ReactNode;
}

interface ToggleProps<T> {
  value: T;
  options: Option<T>[];
  size?: ToggleSize;
  height?: number;
  className?: string;
  onChangeValue: (value: T) => void;
}

export enum ToggleSize {
  Large = 'Large',
  Medium = 'Medium',
  Small = 'Small',
}

function cellStyling(optionsLength: number, index: number) {
  return {
    width: `${100 / optionsLength}%`,
    transform: `translateX(${index * 100}%)`,
  };
}

function renderLabels<T>(option: Option<T>) {
  return (
    <>
      <div className={style.label}>{option.label}</div>
      {option.sublabel && <div className={style.sublabel}>{option.sublabel}</div>}
    </>
  );
}

export function Toggle<T>(props: ToggleProps<T>) {
  const { value, onChangeValue, className, options, size = ToggleSize.Medium } = props;
  const selectedIdx = options.findIndex(opt => opt.value === value);
  const selectedOption = options[selectedIdx];

  return (
    <div
      className={cx(
        style.toggleWrapper,
        size === ToggleSize.Small && style.small,
        size === ToggleSize.Medium && style.medium,
        size === ToggleSize.Large && style.large,
        className,
      )}
    >
      {options.map((option, idx) => (
        <div
          key={`${option.label}-${idx}`}
          onClick={() => onChangeValue(option.value)}
          className={style.cell}
          style={cellStyling(options.length, idx)}
        >
          {renderLabels(option)}
        </div>
      ))}
      <div className={style.cell} style={cellStyling(options.length, selectedIdx)}>
        <div className={style.switch}>
          <div className={style.boldLabels}>
            <div className={style.cell}>{renderLabels(selectedOption)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
