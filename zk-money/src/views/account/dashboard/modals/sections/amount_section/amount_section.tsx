import type { RemoteAsset } from 'alt-model/types';
import { useState } from 'react';
import { InfoWrap, AmountSelection } from 'ui-components';
import { BlockTitle, BorderBox, InfoButton } from 'components';
import { MiniBalanceIndicator } from './mini_balance_indicator';
import { Privacy } from './privacy';
import { InputAnnotation } from './types';
import style from './amount_section.module.scss';

function Info() {
  return (
    <>
      <p>
        Although other information is encrypted, the numerical value of any given transaction can be located. It is
        important to protect your privacy by withdrawing/sending amounts that make it very hard to guess who proccessed
        the transaction
      </p>
      <p>
        <b>
          <i>The Anonymity Set: </i>
        </b>
        your funds are grouped with other users privately in a roll-up. These are then sent approx every 2 hours. This
        is the most cost effective transaction as everyone shares the fee.
      </p>
    </>
  );
}

interface AmountSectionProps {
  asset: RemoteAsset;
  amountStr: string;
  maxAmount: bigint;
  onChangeAmountStr: (amountStr: string) => void;
  allowAssetSelection?: boolean;
  amountStrAnnotation?: InputAnnotation;
  hidePrivacy?: boolean;
  message?: string;
}

export function AmountSection(props: AmountSectionProps) {
  const [showingInfo, setShowingInfo] = useState(false);

  return (
    <BorderBox area="amount">
      <InfoWrap
        showingInfo={showingInfo}
        onHideInfo={() => setShowingInfo(false)}
        infoHeader={`Asset Amount & Privacy`}
        infoContent={<Info />}
        borderRadius={20}
      >
        <div className={style.content}>
          <BlockTitle title="Amount" info={<MiniBalanceIndicator asset={props.asset} />} />
          <AmountSelection
            asset={props.asset}
            allowAssetSelection={props.allowAssetSelection}
            maxAmount={props.maxAmount}
            onChangeAmountString={props.onChangeAmountStr}
            amountString={props.amountStr}
          />
          <div className={style.errorMessage}>{props.message}</div>
          {!props.hidePrivacy && <Privacy className={style.privacy} asset={props.asset} />}
          <InfoButton className={style.styledInfoButton} onClick={() => setShowingInfo(true)} />
        </div>
      </InfoWrap>
    </BorderBox>
  );
}
