import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ToastGroup, ToastGroupPosition } from './toast_group';
import { ToastType } from '../index';

export default {
  title: 'ToastGroup',
  component: ToastGroup,
} as ComponentMeta<typeof ToastGroup>;

const Template: ComponentStory<typeof ToastGroup> = args => <ToastGroup {...args} />;

export const BottomLeft = Template.bind({});
BottomLeft.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.BottomLeft,
  onCloseToast: () => {},
};

export const BottomRight = Template.bind({});
BottomRight.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.BottomRight,
  onCloseToast: () => {},
};

export const BottomCenter = Template.bind({});
BottomCenter.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.BottomCenter,
  onCloseToast: () => {},
};

export const TopRight = Template.bind({});
TopRight.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.TopRight,
  onCloseToast: () => {},
};

export const TopLeft = Template.bind({});
TopLeft.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.TopLeft,
  onCloseToast: () => {},
};

export const TopCenter = Template.bind({});
TopCenter.args = {
  toasts: [
    { text: `Toast #2`, type: ToastType.ERROR, closable: true },
    { text: `Toast #1`, type: ToastType.WARNING, closable: true },
    { text: `Toast #0`, closable: true },
  ],
  position: ToastGroupPosition.TopCenter,
  onCloseToast: () => {},
};
