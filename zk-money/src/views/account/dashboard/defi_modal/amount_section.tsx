import { useState } from 'react';
import styled from 'styled-components/macro';
import { GradientBorder, InfoWrap } from 'ui-components';
import { Asset } from '../../../../app';
import { InfoButton, ShieldedAssetIcon, Text } from '../../../../components';
import { AmountInput } from './amount_input';
import { InputValidationAnnotation } from './input_validation_message';
import { MiniBalanceIndicator } from './mini_balance_indicator';
import { Privacy } from './privacy';
import { InputAnnotation } from './types';
import { Dropdown } from 'components/dropdown';
import downArrow from '../../../../images/down_arrow.svg';
import { spacings } from '../../../../styles';
import style from './amount_section.module.scss';

const Content = styled.div`
  padding: ${spacings.m};
`;

const StyledAmountInput = styled(AmountInput)`
  margin-right: 10px;
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: end;
  margin-bottom: 14px;
  justify-content: space-between;
`;

const StyledInfoButton = styled(InfoButton)`
  position: absolute;
  bottom: 10px;
  right: 10px;
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
  maxAmount: bigint;
  onChangeAmountStr: (amountStr: string) => void;
  allowAssetSelection?: boolean;
  amountStrAnnotation?: InputAnnotation;
  hidePrivacy?: boolean;
}) {
  const [isAssetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [showingInfo, setShowingInfo] = useState(false);

  const toggleAssetSelector = () => {
    setAssetSelectorOpen(prevValue => !prevValue);
  };

  return (
    <InfoWrap
      showingInfo={showingInfo}
      onHideInfo={() => setShowingInfo(false)}
      infoHeader={`Asset Amount & Privacy`}
      infoContent={<Info />}
      borderRadius={20}
    >
      <Content>
        <Header>
          <Text>Amount</Text>
          <MiniBalanceIndicator asset={props.asset} />
        </Header>
        <div className={style.inputWrapper}>
          {props.allowAssetSelection && (
            <GradientBorder>
              <div className={style.assetSelectorWrapper}>
                <div className={style.assetSelector} onClick={toggleAssetSelector}>
                  <ShieldedAssetIcon asset={props.asset} />
                  <div className={style.assetName}>{props.asset.symbol}</div>
                  <img src={downArrow} />
                </div>
                <Dropdown
                  isOpen={isAssetSelectorOpen}
                  options={[
                    { label: 'zkETH', value: 'zkETH' },
                    { label: 'zkDAI', value: 'zkDAI' },
                    { label: 'zkrenBTC', value: 'zkrenBTC' },
                  ]}
                  onClick={() => {}}
                  onClose={toggleAssetSelector}
                />
              </div>
            </GradientBorder>
          )}
          <StyledAmountInput
            maxAmount={props.maxAmount}
            asset={props.asset}
            placeholder="Enter amount"
            onChangeValue={props.onChangeAmountStr}
            value={props.amountStr}
          />
        </div>
        <InputValidationAnnotation annotation={props.amountStrAnnotation} />
        {!props.hidePrivacy && <Privacy asset={props.asset} />}
        <StyledInfoButton onClick={() => setShowingInfo(true)} />
      </Content>
    </InfoWrap>
  );
}
