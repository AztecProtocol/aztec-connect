import { create } from '@storybook/theming';
import icon from '../public/icon.png';

export default create({
  base: 'light',
  brandTitle: 'Asado',
  brandUrl: 'http://localhost:6006',
  brandImage: icon,
  brandTarget: '_self',
});
