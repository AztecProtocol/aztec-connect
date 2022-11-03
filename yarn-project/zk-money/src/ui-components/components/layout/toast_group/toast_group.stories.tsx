import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ToastGroup } from './toast_group.js';

export default {
  title: 'Layout/ToastGroup',
  component: ToastGroup,
} as ComponentMeta<typeof ToastGroup>;

const Template: ComponentStory<typeof ToastGroup> = args => <ToastGroup {...args} />;

export const Example = Template.bind({});
Example.args = {
  toasts: [{ text: `Toast #0`, isClosable: true }],
  onCloseToast: () => {},
};
