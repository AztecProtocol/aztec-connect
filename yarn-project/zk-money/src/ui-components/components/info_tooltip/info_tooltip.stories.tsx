import { ComponentStory, ComponentMeta } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { InfoTooltip } from './info_tooltip';

export default {
  title: 'InfoTooltip',
  component: InfoTooltip,
} as ComponentMeta<typeof InfoTooltip>;

const Template: ComponentStory<typeof InfoTooltip> = args => (
  <MemoryRouter>
    <InfoTooltip {...args} />
  </MemoryRouter>
);

export const Example = Template.bind({});
Example.args = {};
