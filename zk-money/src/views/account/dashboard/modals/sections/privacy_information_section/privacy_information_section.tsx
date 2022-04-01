import { ProgressBar } from 'ui-components';
import { InformationSection } from '../information_section';
import fullPrivacy from 'images/full_privacy.svg';
import style from './privacy_information_section.module.scss';

function PrivacyToAlias() {
  return (
    <div className={style.fullPrivacyWrapper}>
      <img src={fullPrivacy} />
      <div className={style.text}>Payments to Alias’ are end to end encrypted!</div>
    </div>
  );
}

function PrivacyBar() {
  return (
    <div className={style.privacyWrapper}>
      <div className={style.title}>MAX: 15,000</div>
      <ProgressBar className={style.bar} progress={0.5} />
      <div className={style.text}>This transaction hides amongst 2578 users who have zkDai in zkMoney</div>
    </div>
  );
}

interface PrivacyInformationSectionProps {
  txToAlias?: boolean;
}

export function PrivacyInformationSection(props: PrivacyInformationSectionProps) {
  return (
    <InformationSection
      title="Privacy"
      subtitle="Max"
      content={props.txToAlias ? <PrivacyToAlias /> : <PrivacyBar />}
      buttonLabel="Why is this important?"
    />
  );
}
