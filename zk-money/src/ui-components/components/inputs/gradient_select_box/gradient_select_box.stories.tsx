import { ComponentStory, ComponentMeta } from '@storybook/react';

import { GradientSelectBox } from './gradient_select_box';

export default {
  title: 'Input/GradientSelectBox',
  component: GradientSelectBox,
} as ComponentMeta<typeof GradientSelectBox>;

const Template: ComponentStory<typeof GradientSelectBox> = args => <GradientSelectBox {...args} />;

export const Example = Template.bind({});
Example.args = { children: 'Placeholder' };
