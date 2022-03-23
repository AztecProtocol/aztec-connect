import type { RemoteAsset } from 'alt-model/types';
import { useState } from 'react';
import { InfoWrap, AmountSelection } from 'ui-components';
import { BlockTitle, BorderBox, InfoButton } from 'components';
import { MiniL1BalanceIndicator, MiniL2BalanceIndicator } from './mini_balance_indicators';
import { Privacy } from './privacy';
import { InputAnnotation } from './types';
import style from './amount_section.module.scss';
import { DropdownOption } from 'components/dropdown';

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

type BalanceType = 'L1' | 'L2';

function renderBalanceIndicator(balanceType: BalanceType, asset: RemoteAsset) {
  switch (balanceType) {
    case 'L1':
      return <MiniL1BalanceIndicator asset={asset} />;
    case 'L2':
      return <MiniL2BalanceIndicator asset={asset} />;
  }
}

interface AmountSectionProps {
  asset: RemoteAsset;
  assets?: RemoteAsset[];
  amountStr: string;
  maxAmount: bigint;
  onChangeAmountStr: (amountStr: string) => void;
  onChangeAsset?: (option: DropdownOption<string>) => void;
  allowAssetSelection?: boolean;
  amountStrAnnotation?: InputAnnotation;
  hidePrivacy?: boolean;
  message?: string;
  balance?: boolean;
  balanceType: BalanceType;
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
          <BlockTitle title="Amount" info={renderBalanceIndicator(props.balanceType, props.asset)} />
          <AmountSelection
            asset={props.asset}
            assets={props.assets}
            allowAssetSelection={props.allowAssetSelection}
            maxAmount={props.maxAmount}
            onChangeAmountString={props.onChangeAmountStr}
            onChangeAsset={props.onChangeAsset}
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
