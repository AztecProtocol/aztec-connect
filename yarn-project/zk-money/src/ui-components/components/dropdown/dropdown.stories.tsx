import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Dropdown } from './dropdown';

export default {
  title: 'Dropdown',
  component: Dropdown,
  decorators: [centered],
} as ComponentMeta<typeof Dropdown>;

const Template: ComponentStory<typeof Dropdown> = args => <Dropdown {...args} />;

export const Options = Template.bind({});
Options.args = {};
