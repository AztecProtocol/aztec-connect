import { ComponentStory, ComponentMeta } from '@storybook/react';
import { FaqHint } from '../index';
import { SectionTitle } from './section_title';
import centered from '@storybook/addon-centered/react';

export default {
  title: 'SectionTitle',
  component: SectionTitle,
  decorators: [centered],
} as ComponentMeta<typeof SectionTitle>;

const Template: ComponentStory<typeof SectionTitle> = args => <SectionTitle {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: 'Section title',
};

export const ExampleWithFAQ = Template.bind({});
ExampleWithFAQ.args = {
  label: 'Section title',
  sideComponent: <FaqHint />,
};
