import styled from 'styled-components/macro';
import infoIcon from '../../images/information.svg';
import { IconButtonBase } from './icon_button_base';
import style from './info_button.module.scss';

const StyledInfoButton = styled(IconButtonBase)`
  background-image: url(${infoIcon});
  width: 20px;
  height: 20px;
  border-radius: 5px;
`;

interface InfoButton {
  onClick?: () => void;
  className?: string;
}

export function InfoButton({ onClick, className }: InfoButton) {
  return (
    <div onClick={onClick} className={`${style.infoButtonWrapper} ${className}`}>
      <StyledInfoButton />
    </div>
  );
}
