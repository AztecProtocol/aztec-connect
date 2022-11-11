import style from './section_title.module.scss';

interface SectionTitleProps {
  label: string;
  sideComponent?: JSX.Element;
}

export function SectionTitle({ label, sideComponent }: SectionTitleProps) {
  return (
    <div className={style.sectionTitleWrapper}>
      <h1 className={style.title}>{label}</h1>
      {sideComponent}
    </div>
  );
}
