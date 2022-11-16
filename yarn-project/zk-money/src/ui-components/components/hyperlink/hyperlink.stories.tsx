import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Hyperlink } from './hyperlink';

export default {
  title: 'Hyperlink',
  component: Hyperlink,
} as ComponentMeta<typeof Hyperlink>;

const Template: ComponentStory<typeof Hyperlink> = args => <Hyperlink {...args} />;

export const Example = Template.bind({});
Example.args = { label: 'This is an hyperlink', href: 'https://aztec.network' };
