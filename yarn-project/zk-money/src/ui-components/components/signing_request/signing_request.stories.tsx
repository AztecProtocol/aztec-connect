import { ComponentStory, ComponentMeta } from '@storybook/react';
import { SigningRequest } from './signing_request';

export default {
  title: 'SigningRequest',
  component: SigningRequest,
} as ComponentMeta<typeof SigningRequest>;

const Template: ComponentStory<typeof SigningRequest> = args => <SigningRequest {...args} />;

export const MessageSigningWrongNetwork = Template.bind({});
MessageSigningWrongNetwork.args = {
  messageToBeSigned:
    'Sign this message to generate your Aztec Privacy Key. This key lets the application decrypt your balance on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.',
  toastMessage: 'Please switch your network to mainnet',
  onRequest: () => {},
  requestButtonDisabled: true,
};

export const MessageSigningRetry = Template.bind({});
MessageSigningRetry.args = {
  messageToBeSigned:
    'Signing this message will allow your pending funds to be spent in Aztec transaction:\n\n0x12341234123412341234123412341234123412412341234124123412341234\n\nIMPORTANT: Only sign the message if you trust the client',
  toastMessage: 'Has the signing request been lost?',
  onRequest: () => {},
  requestButtonDisabled: false,
};
