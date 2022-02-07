import styled from 'styled-components/macro';
import infoIcon from '../../images/information.svg';
import { IconButtonBase } from './icon_button_base';

export const InfoButton = styled(IconButtonBase)`
  background-image: url(${infoIcon});
  width: 20px;
  height: 20px;
`;
