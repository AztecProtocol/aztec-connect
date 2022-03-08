import { InfoButton } from 'components';
import styled from 'styled-components/macro';

const CardDescriptionLabel = styled.div`
  font-style: italic;
  flex-direction: row;
  font-size: 14px;
  margin-right: 30px;
  line-height: 24px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  overflow: hidden;
`;

const CardDescriptionWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20px 40px;
`;

interface DefiCardDescriptionProps {
  onOpenInformation: () => void;
  text: string;
}

export const DefiCardDescription = ({ onOpenInformation, text }: DefiCardDescriptionProps) => {
  return (
    <CardDescriptionWrapper>
      <CardDescriptionLabel>{text}</CardDescriptionLabel>
      <InfoButton onClick={onOpenInformation} />
    </CardDescriptionWrapper>
  );
};
