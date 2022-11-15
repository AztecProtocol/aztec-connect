import style from './section.module.scss';

interface SectionProps {
  children?: React.ReactNode;
}

export function Section(props: SectionProps) {
  return <div className={style.section}>{props.children}</div>;
}
