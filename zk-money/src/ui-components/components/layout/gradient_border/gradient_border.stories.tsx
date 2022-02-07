import { ComponentStory, ComponentMeta } from '@storybook/react';

import { GradientBorder } from './gradient_border';

export default {
  title: 'Layout/GradientBorder',
  component: GradientBorder,
} as ComponentMeta<typeof GradientBorder>;

const Template: ComponentStory<typeof GradientBorder> = args => <GradientBorder {...args} />;

export const Example = Template.bind({});
Example.args = {
  children: 'Some content with a gradient border around it',
};
