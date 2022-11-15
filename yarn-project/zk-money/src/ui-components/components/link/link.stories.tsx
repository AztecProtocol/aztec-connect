import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Link } from './link';

export default {
  title: 'Link',
  component: Link,
  decorators: [centered],
} as ComponentMeta<typeof Link>;

const Template: ComponentStory<typeof Link> = args => <Link {...args} />;

export const Example = Template.bind({});
Example.args = {};
