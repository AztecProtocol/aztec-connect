import { ComponentStory, ComponentMeta } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { Select } from './select';

export default {
  title: 'Select',
  component: Select,
  decorators: [centered],
} as ComponentMeta<typeof Select>;

const Template: ComponentStory<typeof Select> = args => <Select {...args} />;

export const Example = Template.bind({});
Example.args = {
  options: [
    { label: 'Option #1', value: 1 },
    { label: 'Option #2', value: 2 },
    { label: 'Option #3', value: 3 },
  ],
  placeholder: 'Please select an option',
};

export const Selected = Template.bind({});
Selected.args = {
  options: [
    { label: 'Option #1', value: 1 },
    { label: 'Option #2', value: 2 },
    { label: 'Option #3', value: 3 },
  ],
  value: 2,
};

export const Disabled = Template.bind({});
Disabled.args = {
  options: [
    { label: 'Option #1', value: 1 },
    { label: 'Option #2', value: 2 },
    { label: 'Option #3', value: 3 },
  ],
  disabled: true,
  value: 2,
};

export const WithoutBorder = Template.bind({});
WithoutBorder.args = {
  options: [
    { label: 'Option #1', value: 1 },
    { label: 'Option #2', value: 2 },
    { label: 'Option #3', value: 3 },
  ],
  value: 2,
  showBorder: false,
};
