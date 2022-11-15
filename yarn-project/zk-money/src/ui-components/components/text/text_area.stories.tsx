import { ComponentStory, ComponentMeta } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { TextArea } from './text_area';

export default {
  title: 'TextArea',
  component: TextArea,
} as ComponentMeta<typeof TextArea>;

const Template: ComponentStory<typeof TextArea> = args => (
  <MemoryRouter>
    <TextArea {...args} />
  </MemoryRouter>
);

export const Example = Template.bind({});
Example.args = { text: 'Text' };
