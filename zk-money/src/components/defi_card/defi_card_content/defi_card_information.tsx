import styled from 'styled-components/macro';
import closeIcon from '../../../images/close.svg';

const CloseButton = styled.img`
  position: absolute;
  top: 20px;
  right: 30px;
  width: 17px;
  height: 17px;
  cursor: pointer;
`;

const CardInformation = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(15px);
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100% + 40px);
  color: black;
  border-radius: 20px;
`;

const CardInformationText = styled.div`
  margin-top: 60px;
  margin-right: 30px;
  padding: 0px 40px 10px 30px;
  height: calc(100% - 60px);
  position: absolute;
  top: 0;
  left: 10px;
  overflow: auto;
`;

const TextHeader = styled.h1`
  font-weight: 600;
  margin-bottom: 30px;
  position: absolute;
  top: 20px;
  left: 40px;
`;

const TextParagraph = styled.p`
  margin-bottom: 30px;
  line-height: 22px;
  letter-spacing: 1px;
  font-style: italic;
  font-size: 16px;
`;

const TextBold = styled.span`
  font-weight: 600;
`;

interface DefiCardInformationProps {
  onCloseInformation: () => void;
}

export const DefiCardInformation = ({ onCloseInformation }: DefiCardInformationProps) => {
  return (
    <>
      <CardInformation />
      <CardInformationText>
        <TextParagraph>
          The Anoynimity Set: is encrypted, the numerical value of any given transaction can be located. It is important
          to protect your privacy by withdrawing/sending amounts that make it very hard to guess who processed the
          transaction
        </TextParagraph>
        <TextParagraph>
          <TextBold>Batching:</TextBold> your funds are grouped with other users privately in a roll-up. These are then
          sent approx every 2 hours. This is the most cost effective transaction as evervone shares the fee.
        </TextParagraph>
      </CardInformationText>
      <TextHeader>Defi Investing</TextHeader>
      <CloseButton src={closeIcon} onClick={onCloseInformation} />
    </>
  );
};
