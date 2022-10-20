import { Checkbox, TextLink } from '../../../../../../components/index.js';
import style from './disclaimer.module.scss';

interface DisclaimerProps {
  accepted: boolean;
  onChangeAccepted: (accepted: boolean) => void;
}

export function Disclaimer({ accepted, onChangeAccepted }: DisclaimerProps) {
  return (
    <div className={style.root}>
      <div className={style.header}>
        <div className={style.title}>Disclaimer</div>
        <div className={style.icon} />
      </div>
      <div>
        <div className={style.message}>
          This is experimental software. Use at your own risk.
          <br />
          <br />
          Learn more about our approach to security{' '}
          <TextLink
            inline
            href="https://medium.com/aztec-protocol/layer-by-layer-a-guide-to-aztecs-security-approach-87df087093c0"
            target="_blank"
            underline
          >
            here
          </TextLink>
          .
        </div>
      </div>
      <div className={style.checkboxRow}>
        <div>I understand the risks</div>
        <Checkbox checked={accepted} onChangeValue={onChangeAccepted} />
      </div>
    </div>
  );
}
