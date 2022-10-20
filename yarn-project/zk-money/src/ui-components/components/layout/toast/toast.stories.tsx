import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Toast } from './toast.js';

export default {
  title: 'Layout/Toast',
  component: Toast,
} as ComponentMeta<typeof Toast>;

const Template: ComponentStory<typeof Toast> = args => <Toast {...args} />;

export const Example = Template.bind({});
Example.args = {
  text: 'This is a toast',
  isClosable: true,
  isHeavy: false,
  primaryButton: { text: 'Primary', onClick: () => {} },
  secondaryButton: { text: 'Secondary', onClick: () => {} },
  onCloseToast: () => {},
};
