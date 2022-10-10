import { Button } from '../../../../../../components/index.js';
import { FaqHint } from '../../../../../../ui-components/index.js';
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
      {props.feedback && <div className={style.feedback}>{props.feedback}</div>}
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
