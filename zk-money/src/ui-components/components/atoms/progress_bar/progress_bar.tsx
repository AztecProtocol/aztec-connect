import style from './progress_bar.module.scss';

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className={style.root}>
      <div className={style.completion} style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
