import { ComponentStory, ComponentMeta } from '@storybook/react';
import { StepStatus } from '../../atoms';

import { SubmissionFlow } from './submission_flow';

export default {
  title: 'Molecules/SubmissionFlow',
  component: SubmissionFlow,
} as ComponentMeta<typeof SubmissionFlow>;

const Template: ComponentStory<typeof SubmissionFlow> = args => <SubmissionFlow {...args} />;

export const Prompting = Template.bind({});
Prompting.args = {
  labels: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  activeItem: {
    idx: 1,
    status: StepStatus.ERROR,
    fieldContent: 'An interaction',
    expandedContent: 'Please perform interaction',
  },
};

export const Running = Template.bind({});
Running.args = {
  labels: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  activeItem: {
    idx: 1,
    status: StepStatus.RUNNING,
  },
};

export const AllDone = Template.bind({});
AllDone.args = {
  labels: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  activeItem: {
    idx: 3,
    status: StepStatus.DONE,
  },
};
