import { ComponentStory, ComponentMeta } from '@storybook/react';

import { BridgeCountDown } from './bridge_count_down';

export default {
  title: 'ZkMoney/Defi/BridgeCountDown',
  component: BridgeCountDown,
} as ComponentMeta<typeof BridgeCountDown>;

const Template: ComponentStory<typeof BridgeCountDown> = args => <BridgeCountDown {...args} />;

export const Example = Template.bind({});
Example.args = { takenSlots: 2, totalSlots: 10, nextBatch: new Date(Date.now() + 1000 * 60 * 60 * 2) };
