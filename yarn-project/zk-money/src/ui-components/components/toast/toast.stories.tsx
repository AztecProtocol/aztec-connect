import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ToastType } from './toast.types';
import { Toast } from './toast';

export default {
  title: 'Toast',
  component: Toast,
  decorators: [centered],
} as ComponentMeta<typeof Toast>;

const Template: ComponentStory<typeof Toast> = args => <Toast {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  toast: {
    text: 'This is a toast',
    closable: true,
    heavy: false,
    primaryButton: { text: 'Primary', onClick: () => {} },
    secondaryButton: { text: 'Secondary', onClick: () => {} },
  },
  onCloseToast: () => {},
};

export const Error = Template.bind({});
Error.args = {
  toast: {
    text: 'This is a toast',
    closable: true,
    type: ToastType.ERROR,
    heavy: false,
    primaryButton: { text: 'Primary', onClick: () => {} },
    secondaryButton: { text: 'Secondary', onClick: () => {} },
  },
  onCloseToast: () => {},
};

export const Warning = Template.bind({});
Warning.args = {
  toast: {
    text: 'This is a toast',
    closable: true,
    type: ToastType.WARNING,
    heavy: false,
    primaryButton: { text: 'Primary', onClick: () => {} },
    secondaryButton: { text: 'Secondary', onClick: () => {} },
  },
  onCloseToast: () => {},
};
