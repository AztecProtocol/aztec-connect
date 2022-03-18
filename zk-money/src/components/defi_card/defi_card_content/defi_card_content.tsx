import { useState } from 'react';
import styled from 'styled-components/macro';
import { InfoWrap } from 'ui-components';
import { Button } from '../..';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiCardDescription } from './defi_card_description';
import { DefiCardInfoContent } from './defi_card_info_content';
import { DefiCardProgress } from './defi_card_progress';
import { DefiCardStats } from './defi_card_stats';

const DefiCardContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const DefiCardButton = styled(Button)`
  margin: 20px 0 25px 0;
  width: 185px;
  align-self: center;
`;

interface DefiCardContentProps {
  onSelect: (recipe: DefiRecipe) => void;
  recipe: DefiRecipe;
}

export const DefiCardContent = (props: DefiCardContentProps) => {
  const [isInformationOpen, setIsInformationOpen] = useState(false);

  const handleOpenInformation = () => {
    setIsInformationOpen(true);
  };

  const handleCloseInformation = () => {
    setIsInformationOpen(false);
  };

  const handleClickDeposit = () => {
    props.onSelect(props.recipe);
  };

  return (
    <InfoWrap
      showingInfo={isInformationOpen}
      onHideInfo={handleCloseInformation}
      infoHeader="Defi Investing"
      infoContent={<DefiCardInfoContent />}
      borderRadius={20}
    >
      <DefiCardContentWrapper>
        <DefiCardDescription onOpenInformation={handleOpenInformation} text={props.recipe.shortDesc} />
        <DefiCardStats recipe={props.recipe} />
        <DefiCardProgress />
        <DefiCardButton theme="gradient" text="Deposit zkETH" onClick={handleClickDeposit} />
      </DefiCardContentWrapper>
    </InfoWrap>
  );
};
