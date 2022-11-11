import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../../index.js';
import style from './signing_request.module.scss';

function insertBreaks(text: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    out.push(lines[idx]);
    if (idx < lines.length - 1) {
      out.push(<br key={`line-${idx}`} />);
    }
  }
  return out;
}

interface SigningRequestProps {
  messageToBeSigned?: string;
  waitingForSignature?: boolean;
  prompt?: string;
  toastMessage?: string;
  requestButtonDisabled: boolean;
  onRequest?: () => void;
  onCancel?: () => void;
}

export function SigningRequest(props: SigningRequestProps) {
  return (
    <div className={style.root}>
      {props.prompt}
      {props.messageToBeSigned && (
        <div className={style.signingMessageSection}>
          <div className={style.sigingMessageHeader}>Please sign the following message in your wallet:</div>
          <div className={style.signingMessageContent}>{insertBreaks(props.messageToBeSigned)}</div>
        </div>
      )}
      <div className={style.interactions}>
        <ConnectButton accountStatus="address" showBalance={false} />
        <Button onClick={props.onRequest} text={'Sign'} disabled={props.requestButtonDisabled} />
      </div>
    </div>
  );
}
