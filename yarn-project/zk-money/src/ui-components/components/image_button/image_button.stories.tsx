import { ComponentMeta, ComponentStory } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { ImageButton, ImageButtonIcon } from './image_button';

export default {
  title: 'ImageButton',
  component: ImageButton,
  decorators: [centered],
} as ComponentMeta<typeof ImageButton>;

const Story: ComponentStory<typeof ImageButton> = args => <ImageButton {...args} />;

export const Label = Story.bind({});
Label.args = {
  label: 'Aztec Account',
  icon: ImageButtonIcon.Wallet,
};

export const Disabled = Story.bind({});
Disabled.args = {
  label: 'Aztec Account',
  icon: ImageButtonIcon.Wallet,
  disabled: true,
};

export const Sublabel = Story.bind({});
Sublabel.args = {
  label: 'Aztec Account',
  sublabel: 'Generated from: 0x2c3...13D4',
  icon: ImageButtonIcon.Wallet,
};
