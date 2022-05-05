import { Link } from 'components';
import faqIcon from '../../../images/faq_icon_gradient.svg';
import style from './faq_hint.module.scss';

export function FaqHint({ className }: { className?: string }) {
  return (
    <Link
      className={`${style.link} ${className}`}
      href="https://aztec-protocol.gitbook.io/zk-money/faq"
      target="_blank"
    >
      <span className={style.label}>Need help?</span>
      <img className={style.icon} src={faqIcon} alt="FAQ" />
    </Link>
  );
}
