import { bindStyle } from 'ui-components/util/classnames';
import style from './progress_bar.module.scss';

const cx = bindStyle(style);

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  return (
    <div className={cx(style.root, props.className)}>
      <div className={style.completion} style={{ width: `${props.progress * 100}%` }} />
    </div>
  );
}
