import { useState } from 'react';
import styled from 'styled-components/macro';
import { InfoWrap } from 'ui-components';
import { Asset } from '../../../../app';
import { InfoButton, Spacer, Text } from '../../../../components';
import { spacings } from '../../../../styles';
import { AmountInput } from './amount_input';
import { InputValidationAnnotation } from './input_validation_message';
import { MiniBalanceIndicator } from './mini_balance_indicator';
import { Privacy } from './privacy';
import { InputAnnotation } from './types';

const Content = styled.div`
  padding: ${spacings.l} ${spacings.m};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
`;

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

export function AmountSection(props: {
  asset: Asset;
  amountStr: string;
  onChangeAmountStr: (amountStr: string) => void;
  amountStrAnnotation?: InputAnnotation;
}) {
  const [showingInfo, setShowingInfo] = useState(false);
  return (
    <InfoWrap
      showingInfo={showingInfo}
      onHideInfo={() => setShowingInfo(false)}
      infoHeader="Asset Amount & Privacy"
      infoContent={<Info />}
      borderRadius={20}
    >
      <Content>
        <Header>
          <Text>Amount</Text>
          <MiniBalanceIndicator asset={props.asset} />
        </Header>
        <Spacer />
        <AmountInput
          asset={props.asset}
          placeholder="Enter amount"
          onChangeValue={props.onChangeAmountStr}
          value={props.amountStr}
        />
        <Spacer size="xxs" />
        <InputValidationAnnotation annotation={props.amountStrAnnotation} />
        <Spacer size="l" />
        <Privacy asset={props.asset} />
        <InfoButton onClick={() => setShowingInfo(true)} />
      </Content>
    </InfoWrap>
  );
}
