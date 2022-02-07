import { ComponentStory, ComponentMeta } from '@storybook/react';

import { WalletAccountIndicator } from './wallet_account_indicator';

export default {
  title: 'Atoms/WalletAccountIndicator',
  component: WalletAccountIndicator,
} as ComponentMeta<typeof WalletAccountIndicator>;

const Template: ComponentStory<typeof WalletAccountIndicator> = args => <WalletAccountIndicator {...args} />;

export const Example = Template.bind({});
Example.args = { wallet: 'metamask', address: '0x12345678901234567890' };
