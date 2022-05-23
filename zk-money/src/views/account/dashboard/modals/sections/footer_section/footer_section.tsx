import { Button } from 'components';
import { FaqHint } from 'ui-components';
import style from './footer_section.module.css';

interface FooterSectionProps {
  onNext: () => void;
  nextDisabled: boolean;
  feedback?: string;
}

export function FooterSection(props: FooterSectionProps) {
  return (
    <div className={style.root}>
      <FaqHint />
      <div className={style.feedback}>{props.feedback}</div>
      <div className={style.nextWrapper}>
        <Button
          className={style.nextButton}
          text="Next"
          theme="gradient"
          onClick={props.onNext}
          disabled={props.nextDisabled}
        />
      </div>
    </div>
  );
}
