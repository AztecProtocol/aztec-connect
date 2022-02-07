import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ProgressBar } from './progress_bar';

export default {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
} as ComponentMeta<typeof ProgressBar>;

const Template: ComponentStory<typeof ProgressBar> = args => <ProgressBar {...args} />;

export const Empty = Template.bind({});
Empty.args = { progress: 0 };

export const Half = Template.bind({});
Half.args = { progress: 0.5 };

export const Full = Template.bind({});
Full.args = { progress: 1 };
