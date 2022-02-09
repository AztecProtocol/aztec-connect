import styled from 'styled-components/macro';
import daiShieldIcon from '../../../images/dai_shield.svg';
import openIcon from '../../../images/open.svg';
import loadingIcon from '../../../images/defi_loader.svg';
import aaveIcon from '../../../images/aave.svg';
import { gradients } from '../../../styles';
import { Button } from '../..';

const InvestmentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 10px;
  margin: 5px 0;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  height: 60px;
  overflow: hidden;
`;

const Name = styled.div`
  display: flex;
  letter-spacing: 0.02em;
  padding: 0 25px 0 5px;
  flex-shrink: 1;
`;

const Values = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  border: 1px solid #eeeeee;
  border-width: 0 1px 0 1px;
  padding: 0 25px;
  font-size: 16px;
  justify-content: space-between;
  letter-spacing: 0.1em;
  flex-grow: 1;
  flex-shrink: 1;
`;

const Actions = styled.div`
  font-size: 16px;
  flex-shrink: 0;
  padding: 0 5px 0 25px;
  width: 150px;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  /* the width is to make the button appear with no shrinking */
  width: 192px;
  justify-content: space-between;
`;

const NameLabel = styled.div`
  display: flex;
  align-items: center;
`;

const APYRate = styled.div`
  font-style: italic;
  background-color: ${gradients.primary.from};
  background-image: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  background-size: 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
`;

const Amount = styled.div`
  display: flex;
  align-items: center;
`;

interface DefiLogoProps {
  isLoading: boolean;
}

const DefiLogo = styled.img<DefiLogoProps>`
  width: 30px;
  margin-right: 20px;
  opacity: ${({ isLoading }) => (isLoading ? 0.5 : 1)};
`;

const DaiShieldLogo = styled.img`
  width: 30px;
  margin-right: 20px;
`;

const ETA = styled.div`
  color: #b7bccd;
  font-style: italic;
  flex-shrink: 1;
`;

const OpenButton = styled.img`
  width: 20px;
`;

const LoadingIcon = styled.img`
  width: 20px;
  margin: 0 10px;
`;

interface DefiInvestmentProps {
  name: string;
  apy: number;
  amount: number;
  eta?: number;
  isLocked?: boolean;
}

export function DefiInvestment({ name, apy, amount, eta, isLocked }: DefiInvestmentProps) {
  let actions;
  if (eta) {
    actions = (
      <>
        <OpenButton src={openIcon} />
        <LoadingIcon src={loadingIcon} />
        <ETA>~{eta} mins</ETA>
      </>
    );
  } else if (isLocked) {
    actions = (
      <>
        <ETA>Fixed Term ~90 days</ETA>
      </>
    );
  } else {
    actions = (
      <>
        <Button text={`Claim & Exit`} />
      </>
    );
  }

  return (
    <InvestmentWrapper>
      <Name>
        <DefiLogo isLoading={!!eta} src={aaveIcon} />
        <NameLabel>{name}</NameLabel>
      </Name>
      <Values>
        <APYRate>Variable: {apy}% APY</APYRate>
        <Amount>
          <DaiShieldLogo src={daiShieldIcon} />
          {amount} zkDAI
        </Amount>
      </Values>
      <Actions>{actions}</Actions>
    </InvestmentWrapper>
  );
}
