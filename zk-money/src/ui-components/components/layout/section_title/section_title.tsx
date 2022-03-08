import { FaqHint } from '../../inputs/faq_hint';
import style from './section_title.module.scss';

interface SectionTitle {
  label: string;
  showFaq?: boolean;
}

export function SectionTitle({ label, showFaq }: SectionTitle) {
  return (
    <div className={style.sectionTitleWrapper}>
      <h1 className={style.title}>{label}</h1>
      {showFaq && <FaqHint />}
    </div>
  );
}
