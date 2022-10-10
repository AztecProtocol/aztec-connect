import { default as styled } from 'styled-components';
import closeIcon from '../../images/close.svg';
import { IconButtonBase } from './icon_button_base.js';

export const CloseButton = styled(IconButtonBase)`
  background-image: url(${closeIcon});
`;
