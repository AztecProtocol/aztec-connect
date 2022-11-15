import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Field, FieldStatus, Layer } from './field';

export default {
  title: 'Field',
  component: Field,
  decorators: [centered],
} as ComponentMeta<typeof Field>;

const Template: ComponentStory<typeof Field> = args => <Field {...args} />;

export const Placeholder = Template.bind({});
Placeholder.args = {
  label: 'Label',
  placeholder: 'Placeholder',
};

export const Value = Template.bind({});
Value.args = {
  label: 'Label',
  value: 'Input value',
};

export const Sublabel = Template.bind({});
Sublabel.args = {
  label: 'Label',
  sublabel: 'Sublabel',
  value: 'Input value',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Label',
  value: 'Input value',
  disabled: true,
};

export const Monospaced = Template.bind({});
Monospaced.args = {
  label: 'Label',
  value: 'Input value',
  monospaced: true,
};

export const Message = Template.bind({});
Message.args = {
  label: 'Label',
  value: 'Input value',
  message: 'Additional comment',
};

export const Layer1AssetSelector = Template.bind({});
Layer1AssetSelector.args = {
  label: 'Label',
  balance: '0.0125',
  selectedAsset: { symbol: 'ETH', id: 0 },
  allowAssetSelection: true,
  assetOptions: [
    { value: 0, label: 'ETH' },
    { value: 1, label: 'DAI' },
    { value: 2, label: 'USDC' },
    { value: 2, label: 'USDT' },
  ],
};

export const Layer2AssetSelector = Template.bind({});
Layer2AssetSelector.args = {
  label: 'Label',
  balance: '0.0125',
  layer: Layer.L2,
  selectedAsset: { symbol: 'ETH', id: 0 },
  allowAssetSelection: true,
  assetOptions: [
    { value: 0, label: 'ETH' },
    { value: 1, label: 'DAI' },
    { value: 2, label: 'USDC' },
    { value: 2, label: 'USDT' },
  ],
};

export const AssetPreselected = Template.bind({});
AssetPreselected.args = {
  label: 'Label',
  balance: '0.0125',
  selectedAsset: { symbol: 'ETH', id: 0 },
  assetOptions: [
    { value: 0, label: 'ETH' },
    { value: 1, label: 'DAI' },
    { value: 2, label: 'USDC' },
    { value: 2, label: 'USDT' },
  ],
};

export const Prefix = Template.bind({});
Prefix.args = {
  label: 'Label',
  value: 'alias',
  prefix: '@',
};

export const Loader = Template.bind({});
Loader.args = {
  label: 'Label',
  value: 'Input value',
  status: FieldStatus.Loading,
};

export const Warning = Template.bind({});
Warning.args = {
  label: 'Label',
  value: 'Input value',
  status: FieldStatus.Warning,
  message: 'Warning message',
};

export const Error = Template.bind({});
Error.args = {
  label: 'Label',
  value: 'Input value',
  status: FieldStatus.Error,
  message: 'Error message',
};

export const Success = Template.bind({});
Success.args = {
  label: 'Label',
  value: 'Input value',
  status: FieldStatus.Success,
};

export const EverythingOn = Template.bind({});
EverythingOn.args = {
  label: 'Label',
  sublabel: 'Sublabel',
  value: '0.15',
  balance: '0.0125',
  allowAssetSelection: true,
  status: FieldStatus.Loading,
  message: 'This is a message',
  selectedAsset: { symbol: 'ETH', id: 0 },
  assetOptions: [
    { value: 0, label: 'ETH' },
    { value: 1, label: 'DAI' },
    { value: 2, label: 'USDC' },
    { value: 2, label: 'USDT' },
  ],
};
