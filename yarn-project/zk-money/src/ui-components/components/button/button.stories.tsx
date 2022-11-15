import { ComponentMeta, ComponentStory } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { Button, ButtonSize, ButtonTheme } from './button';

export default {
  title: 'Button',
  component: Button,
  decorators: [centered],
} as ComponentMeta<typeof Button>;

const Story: ComponentStory<typeof Button> = args => <Button {...args} />;
export const Primary = Story.bind({});

Primary.args = {
  text: 'Button',
  theme: ButtonTheme.Primary,
};

export const Secondary = Story.bind({});
Secondary.args = {
  text: 'Button',
  theme: ButtonTheme.Secondary,
};

export const CustomGradient = Story.bind({});
CustomGradient.args = {
  text: 'Button',
  gradient: { from: 'white', to: 'gray' },
  color: 'black',
};

export const LongButton = Story.bind({});
LongButton.args = {
  text: 'This is a very, very long button',
};

const StorySizes: ComponentStory<typeof Button> = args => (
  <div style={{ display: 'flex', gap: '20px', alignItems: 'self-end' }}>
    <Button text="Large" size={ButtonSize.Large} {...args} />
    <Button text="Medium" size={ButtonSize.Medium} {...args} />
    <Button text="Small" size={ButtonSize.Small} {...args} />
  </div>
);
export const Sizes = StorySizes.bind({});
