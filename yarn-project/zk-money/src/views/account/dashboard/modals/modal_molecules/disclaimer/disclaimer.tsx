import { Checkbox } from '../../../../../../components/index.js';
import { Hyperlink, HyperlinkIcon } from '../../../../../../ui-components/index.js';
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
          <div className={style.line}>This is experimental software. Use at your own risk.</div>
          <Hyperlink
            theme="gradient"
            icon={HyperlinkIcon.Open}
            href="https://medium.com/aztec-protocol/layer-by-layer-a-guide-to-aztecs-security-approach-87df087093c0"
            label="Learn more about our approach to security here"
          />
        </div>
      </div>
      <div className={style.checkboxRow}>
        <div>I understand the risks</div>
        <Checkbox checked={accepted} onChangeValue={onChangeAccepted} />
      </div>
    </div>
  );
}
