import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Button } from './button.js';

export default {
  title: 'Inputs/Button',
  component: Button,
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = args => <Button {...args} />;

export const Example = Template.bind({});
Example.args = {
  text: 'Button',
};
