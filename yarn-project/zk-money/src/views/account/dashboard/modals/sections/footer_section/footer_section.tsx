import { useWalletInteractionIsOngoing } from '../../../../../../alt-model/wallet_interaction_hooks.js';
import { FaqHint, Button } from '../../../../../../ui-components/index.js';
import style from './footer_section.module.scss';

interface FooterSectionProps {
  onNext: () => void;
  nextDisabled: boolean;
  feedback?: string;
}

export function FooterSection(props: FooterSectionProps) {
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  return (
    <div className={style.root}>
      <FaqHint className={style.faqHint} />
      {props.feedback && <div className={style.feedback}>{props.feedback}</div>}
      <div className={style.nextWrapper}>
        <Button
          className={style.nextButton}
          text="Next"
          onClick={props.onNext}
          disabled={props.nextDisabled || walletInteractionIsOngoing}
        />
      </div>
    </div>
  );
}
