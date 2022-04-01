import styled from 'styled-components/macro';
import { BackButton, ForwardButton } from 'ui-components';
import { DefiRecipe } from 'alt-model/defi/types';
import { CloseButtonWhite, CardAssetTag, CardInvestmentTypeTag } from 'components';

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
const NavButtons = styled.div`
  display: flex;
  gap: 18px;
  align-items: center;
`;

interface DefiModalHeaderProps {
  recipe: DefiRecipe;
  closeDisabled: boolean;
  onClose: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export function DefiModalHeader({ recipe, onClose, closeDisabled, onBack, onForward }: DefiModalHeaderProps) {
  const { logo, investmentType, flow } = recipe;
  return (
    <Root>
      <LeftSeg>
        <Logo src={logo} />
      </LeftSeg>
      <RightSeg>
        <Tags>
          <CardAssetTag asset={flow.enter.inA} />
          <CardInvestmentTypeTag investmentType={investmentType} />
        </Tags>
        <NavButtons>
          <BackButton disabled={!onBack} onClick={onBack} />
          <ForwardButton disabled={!onForward} onClick={onForward} />
        </NavButtons>
        <CloseButtonWhite disabled={closeDisabled} onClick={onClose} />
      </RightSeg>
    </Root>
  );
}
