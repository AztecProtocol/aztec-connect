import { BorderBox } from 'components';
import style from './split_section.module.scss';

interface SplitSectionProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function SplitSection(props: SplitSectionProps) {
  return (
    <BorderBox>
      <div className={style.splitSectionWrapper}>
        <div className={style.leftPanel}>{props.leftPanel}</div>
        <div className={style.rightPanel}>{props.rightPanel}</div>
      </div>
    </BorderBox>
  );
}
