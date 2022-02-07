import styled from 'styled-components/macro';
import closeIconWhite from '../../images/close_white.svg';
import { IconButtonBase } from './icon_button_base';

export const CloseButtonWhite = styled(IconButtonBase)`
  background-image: url(${closeIconWhite});
`;
