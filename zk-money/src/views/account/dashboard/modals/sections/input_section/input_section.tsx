import { BlockTitle } from 'components';
import style from './input_section.module.scss';

interface InputSectionProps {
  title: string;
  titleComponent?: React.ReactNode;
  component?: React.ReactNode;
  errorMessage?: string;
}

export function InputSection(props: InputSectionProps) {
  return (
    <div className={style.content}>
      <BlockTitle title={props.title} info={props.titleComponent} />
      <div className={style.component}>{props.component}</div>
      <div className={style.errorMessage}>{props.errorMessage}</div>
    </div>
  );
}
