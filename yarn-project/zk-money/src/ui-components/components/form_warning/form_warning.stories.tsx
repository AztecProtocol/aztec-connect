import centered from '@storybook/addon-centered/react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FormWarning } from './form_warning';

export default {
  title: 'FormWarning',
  component: FormWarning,
  decorators: [centered],
} as ComponentMeta<typeof FormWarning>;

const Story: ComponentStory<typeof FormWarning> = args => <FormWarning {...args} />;
export const Primary = Story.bind({});

Primary.args = {
  text: 'This is a warning in a form',
};
