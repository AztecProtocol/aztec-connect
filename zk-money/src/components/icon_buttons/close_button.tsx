import styled from 'styled-components/macro';
import closeIcon from '../../images/close.svg';
import { IconButtonBase } from './icon_button_base';

export const CloseButton = styled(IconButtonBase)`
  background-image: url(${closeIcon});
`;
