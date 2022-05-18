import { bindStyle } from 'ui-components/util/classnames';
import style from './vertical_radio_buttons.module.scss';

const cx = bindStyle(style);

type SomeId = string | number;

interface RadioButtonOption<TId extends SomeId> {
  id: TId;
  content: React.ReactNode;
}

interface VerticalRadioButtonsProps<TId extends SomeId> {
  options: RadioButtonOption<TId>[];
  value: TId;
  onChangeValue: (value: TId) => void;
}

export function VerticalRadioButtons<TId extends SomeId>(props: VerticalRadioButtonsProps<TId>) {
  return (
    <div className={style.root}>
      {props.options.map(opt => (
        <div key={opt.id} className={style.opt} onClick={() => props.onChangeValue(opt.id)}>
          <div className={cx(style.cell, { selected: opt.id === props.value })}>
            <div className={style.circle} />
          </div>
          <div className={style.optContent}>{opt.content}</div>
        </div>
      ))}
    </div>
  );
}
