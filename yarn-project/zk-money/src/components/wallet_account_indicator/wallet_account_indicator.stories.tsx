import { ComponentStory, ComponentMeta } from '@storybook/react';
import { WalletId } from '../../app/index.js';

import { WalletAccountIndicator } from './wallet_account_indicator.js';

export default {
  title: 'Atoms/WalletAccountIndicator',
  component: WalletAccountIndicator,
} as ComponentMeta<typeof WalletAccountIndicator>;

const Template: ComponentStory<typeof WalletAccountIndicator> = args => <WalletAccountIndicator {...args} />;

export const Example = Template.bind({});
Example.args = { walletId: WalletId.METAMASK, address: '0x12345678901234567890' };
