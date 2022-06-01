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
      <div className={style.title}>{props.title}</div>
      <div className={style.component}>{props.component}</div>
      <div className={style.errorMessage}>{props.errorMessage}</div>
    </div>
  );
}
