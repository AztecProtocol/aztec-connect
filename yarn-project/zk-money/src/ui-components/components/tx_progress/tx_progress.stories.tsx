import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TxProgress, TxProgressFlow, TxProgressStep } from './tx_progress';

export default {
  title: 'TxProgress',
  component: TxProgress,
} as ComponentMeta<typeof TxProgress>;

const Template: ComponentStory<typeof TxProgress> = args => <TxProgress {...args} />;

export const Example = Template.bind({});
Example.args = {
  flow: TxProgressFlow.L1_DEPOSIT,
  activeStep: TxProgressStep.SIGNING_L1_DEPOSIT,
};
