import faqIcon from '../../../images/faq_icon_gradient.svg';
import style from './section_title.module.scss';

interface SectionTitle {
  label: string;
  showFaq?: boolean;
}

export function SectionTitle({ label, showFaq }: SectionTitle) {
  return (
    <div className={style.sectionTitleWrapper}>
      <h1 className={style.title}>{label}</h1>
      {showFaq && (
        <div>
          <span className={style.label}>Need help?, check out the </span>
          <img className={style.icon} src={faqIcon} />
        </div>
      )}
    </div>
  );
}
