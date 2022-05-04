import { useState } from 'react';
import type { RemoteAsset } from 'alt-model/types';
import { Amount } from 'alt-model/assets';
import { Form, MessageType, isValidForm, SendStatus } from 'app';
import { BorderBox, Button } from 'components';
import { CostBreakdown } from '../modal_molecules/cost_breakdown';
import { Disclaimer } from '../modal_molecules/disclaimer';
import { TransactionComplete } from '../modal_molecules/transaction_complete';
import { VerticalSplitSection } from '../sections/vertical_split_section';
import { SendSubmissionSteps } from './send_submission_steps';
import style from './send_confirmation_page.module.scss';

interface SendConfirmationPageProps {
  asset: RemoteAsset;
  txAmountLimit: bigint;
  items: { recipient: string; amount: Amount; fee: Amount };
  form: Form;
  currentStatus: SendStatus;
  message?: string;
  messageType?: MessageType;
  onSubmit(): void;
  onClose(): void;
}

export function SendConfirmationPage(props: SendConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);

  const validating = props.currentStatus === SendStatus.VALIDATE;
  const pending = props.currentStatus === SendStatus.CONFIRM || validating;
  const failed = props.messageType === MessageType.ERROR && !!props.message;
  const success = props.currentStatus === SendStatus.DONE;
  const expired = props.currentStatus === SendStatus.CONFIRM && !isValidForm(props.form!);
  const shouldShowDisclaimer = !success && !expired && pending;

  return (
    <div className={style.page2Wrapper}>
      <VerticalSplitSection
        topPanel={
          <div className={style.topStats}>
            <div className={style.description}>{'Details about your send transaction'}</div>
          </div>
        }
        bottomPanel={
          <CostBreakdown
            recipient={props.items.recipient}
            amountLabel="Amount"
            amount={props.items.amount}
            fee={props.items.fee}
          />
        }
      />
      <BorderBox>
        {shouldShowDisclaimer ? (
          <Disclaimer
            accepted={riskChecked}
            onChangeAccepted={setRiskChecked}
            asset={props.asset}
            transactionLimit={props.txAmountLimit}
          />
        ) : success ? (
          <TransactionComplete onClose={props.onClose} />
        ) : (
          <SendSubmissionSteps currentStatus={props.currentStatus} failed={failed} />
        )}
      </BorderBox>
      {!success && (
        <div className={style.footer}>
          <Button text={failed ? 'Retry' : 'Confirm Transaction'} onClick={props.onSubmit} disabled={!riskChecked} />
        </div>
      )}
    </div>
  );
}
