import styled from 'styled-components/macro';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { CardAssetTag, CardInvestmentTypeTag } from '../..';

const CardHeaderButtonsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
  position: absolute;
  right: 0;
`;

const CardHeaderLogo = styled.img`
  height: 50px;
  position: absolute;
  left: 0;
`;

const CardHeader = styled.div`
  width: 100%;
  height: 100%;
  padding: 10px 0;
  display: flex;
  flex-direction: row;
  position: relative;
  align-items: center;
`;

export const DefiCardHeader = ({ recipe }: { recipe: DefiRecipe }) => {
  const { bridgeFlow, investmentType, logo } = recipe;
  const { inputAssetId } = bridgeFlow.enter;
  return (
    <CardHeader>
      <CardHeaderLogo src={logo} />
      <CardHeaderButtonsWrapper>
        <CardInvestmentTypeTag investmentType={investmentType} />
        <CardAssetTag assetId={inputAssetId} />
      </CardHeaderButtonsWrapper>
    </CardHeader>
  );
};
