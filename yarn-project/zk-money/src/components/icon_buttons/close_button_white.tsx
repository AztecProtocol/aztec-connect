import { default as styled } from 'styled-components';
import closeIconWhite from '../../images/close_white.svg';
import { IconButtonBase } from './icon_button_base.js';

export const CloseButtonWhite = styled(IconButtonBase)`
  background-image: url(${closeIconWhite});
`;
