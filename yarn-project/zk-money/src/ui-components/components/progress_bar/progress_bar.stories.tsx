import { ComponentStory, ComponentMeta } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { ProgressBar } from './progress_bar';

export default {
  title: 'ProgressBar',
  component: ProgressBar,
  decorators: [centered],
} as ComponentMeta<typeof ProgressBar>;

const Template: ComponentStory<typeof ProgressBar> = args => (
  <div style={{ minWidth: '400px' }}>
    <ProgressBar {...args} />
  </div>
);

export const Empty = Template.bind({});
Empty.args = { progress: 0 };

export const Half = Template.bind({});
Half.args = { progress: 0.5 };

export const Full = Template.bind({});
Full.args = { progress: 1 };
