import { ComponentStory, ComponentMeta } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { MemoryRouter } from 'react-router';
import { Navbar } from './navbar';

export default {
  title: 'Navbar',
  component: Navbar,
  decorators: [centered],
} as ComponentMeta<typeof Navbar>;

const Template: ComponentStory<typeof Navbar> = args => (
  <MemoryRouter>
    <Navbar {...args} />
  </MemoryRouter>
);

export const Example = Template.bind({});
Example.args = { accountComponent: <div>@jaosef</div> };
