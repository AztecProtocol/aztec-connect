import styled from 'styled-components/macro';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { CardAssetTag, CardInvestmentTypeTag } from '../..';

const CardHeaderButtonsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
`;

const CardHeaderLogo = styled.img`
  height: 65px;
`;

export const DeFiCardHeader = ({ recipe }: { recipe: DefiRecipe }) => {
  const { bridgeFlow, investmentType, logo } = recipe;
  const { inputAssetId } = bridgeFlow.enter;
  return (
    <>
      <CardHeaderLogo src={logo} />
      <CardHeaderButtonsWrapper>
        <CardInvestmentTypeTag investmentType={investmentType} />
        <CardAssetTag assetId={inputAssetId} />
      </CardHeaderButtonsWrapper>
    </>
  );
};
