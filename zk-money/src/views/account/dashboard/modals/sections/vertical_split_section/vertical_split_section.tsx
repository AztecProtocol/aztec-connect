import { BorderBox } from 'components';
import style from './vertical_split_section.module.scss';

interface VerticalSplitSectionProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
}

export function VerticalSplitSection(props: VerticalSplitSectionProps) {
  return (
    <BorderBox>
      <div className={style.splitSectionWrapper}>
        <div className={style.topPanel}>{props.topPanel}</div>
        <div className={style.bottomPanel}>{props.bottomPanel}</div>
      </div>
    </BorderBox>
  );
}
