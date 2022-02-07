import styled from 'styled-components/macro';
import { DefiRecipe } from '../../../../alt-model/defi/types';
import { CloseButtonWhite, CardAssetTag, CardInvestmentTypeTag } from '../../../../components';

const Root = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const LeftSeg = styled.div`
  width: 50%;
  height: 100%;
`;
const Logo = styled.img`
  height: 100%;
`;
const RightSeg = styled.div`
  width: 50%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const Tags = styled.div`
  display: flex;
  gap: 18px;
  align-items: center;
`;

interface DefiModalHeaderProps {
  recipe: DefiRecipe;
  closeDisabled: boolean;
  onClose: () => void;
}

export function DefiModalHeader({ recipe, onClose, closeDisabled }: DefiModalHeaderProps) {
  const { logo, bridgeFlow, investmentType } = recipe;
  const { inputAssetId } = bridgeFlow.enter;
  return (
    <Root>
      <LeftSeg>
        <Logo src={logo} />
      </LeftSeg>
      <RightSeg>
        <Tags>
          <CardAssetTag assetId={inputAssetId} />
          <CardInvestmentTypeTag investmentType={investmentType} />
        </Tags>
        <CloseButtonWhite disabled={closeDisabled} onClick={onClose} />
      </RightSeg>
    </Root>
  );
}
