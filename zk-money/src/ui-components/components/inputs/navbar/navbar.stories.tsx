import { ComponentStory, ComponentMeta } from '@storybook/react';
import { MemoryRouter } from 'react-router';

import { Navbar } from './navbar';

export default {
  title: 'Input/Navbar',
  component: Navbar,
} as ComponentMeta<typeof Navbar>;

const Template: ComponentStory<typeof Navbar> = args => (
  <MemoryRouter>
    <Navbar {...args} />
  </MemoryRouter>
);

export const Example = Template.bind({});
Example.args = { accountComponent: <div>@jaosef</div> };
