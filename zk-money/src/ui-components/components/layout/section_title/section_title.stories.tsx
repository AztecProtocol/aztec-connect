import { ComponentStory, ComponentMeta } from '@storybook/react';
import { SectionTitle } from './section_title';

export default {
  title: 'Layout/SectionTitle',
  component: SectionTitle,
} as ComponentMeta<typeof SectionTitle>;

const Template: ComponentStory<typeof SectionTitle> = args => <SectionTitle {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: 'Section title',
};
