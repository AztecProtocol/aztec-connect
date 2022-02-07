import { ComponentStory, ComponentMeta } from '@storybook/react';

import { StepStatusIndicator, StepStatus } from './step_status_indicator';

export default {
  title: 'Atoms/StepStatusIndicator',
  component: StepStatusIndicator,
} as ComponentMeta<typeof StepStatusIndicator>;

const Template: ComponentStory<typeof StepStatusIndicator> = args => <StepStatusIndicator {...args} />;

export const Done = Template.bind({});
Done.args = { status: StepStatus.DONE };

export const Running = Template.bind({});
Running.args = { status: StepStatus.RUNNING };

export const Error = Template.bind({});
Error.args = { status: StepStatus.ERROR };
