import styled from 'styled-components/macro';
import information from '../../../images/information.svg';

const CardDescriptionLabel = styled.div`
  font-style: italic;
  flex-direction: row;
  font-size: 14px;
  margin-right: 30px;
  line-height: 24px;
`;

const CardDescriptionInformationButton = styled.img`
  width: 45px;
  padding: 10px;
  cursor: pointer;
`;

const CardDescriptionWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px 40px;
`;

interface DeFiCardDescriptionProps {
  onOpenInformation: () => void;
  text: string;
}

export const DeFiCardDescription = ({ onOpenInformation, text }: DeFiCardDescriptionProps) => {
  return (
    <CardDescriptionWrapper>
      <CardDescriptionLabel>{text}</CardDescriptionLabel>
      <CardDescriptionInformationButton src={information} onClick={onOpenInformation} />
    </CardDescriptionWrapper>
  );
};
