import { ComponentStory, ComponentMeta } from '@storybook/react';
import { FaqHint } from './faq_hint';

export default {
  title: 'FaqHint',
  component: FaqHint,
} as ComponentMeta<typeof FaqHint>;

const Template: ComponentStory<typeof FaqHint> = args => <FaqHint {...args} />;

export const Example = Template.bind({});
Example.args = {};
