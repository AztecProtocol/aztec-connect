import { ComponentMeta, ComponentStory } from '@storybook/react';
import centered from '@storybook/addon-centered/react';
import { FeeSelector, FeeSelectorStatus } from './fee_selector';

export default {
  title: 'FeeSelector',
  component: FeeSelector,
  decorators: [centered],
} as ComponentMeta<typeof FeeSelector>;

const Template: ComponentStory<typeof FeeSelector> = args => <FeeSelector {...args} />;

export const NoValueSelected = Template.bind({});
NoValueSelected.args = {
  label: 'Label',
  placeholder: 'Placeholder',
  options: [
    { id: 0, content: { label: 'Slow', timeStr: '10 hours', feeAmountStr: '0.00031 ETH', feeBulkPriceStr: '$10.40' } },
    {
      id: 1,
      content: { label: 'Instant', timeStr: '7 minutes', feeAmountStr: '0.0061 ETH', feeBulkPriceStr: '$205.36' },
    },
  ],
};

export const ValueSelected = Template.bind({});
ValueSelected.args = {
  label: 'Label',
  value: 0,
  options: [
    { id: 0, content: { label: 'Slow', timeStr: '10 hours', feeAmountStr: '0.00031 ETH', feeBulkPriceStr: '$10.40' } },
    {
      id: 1,
      content: { label: 'Instant', timeStr: '7 minutes', feeAmountStr: '0.0061 ETH', feeBulkPriceStr: '$205.36' },
    },
  ],
};

export const Warning = Template.bind({});
Warning.args = {
  label: 'Label',
  value: 0,
  status: FeeSelectorStatus.Warning,
  options: [
    { id: 0, content: { label: 'Slow', timeStr: '10 hours', feeAmountStr: '0.00031 ETH', feeBulkPriceStr: '$10.40' } },
    {
      id: 1,
      content: { label: 'Instant', timeStr: '7 minutes', feeAmountStr: '0.0061 ETH', feeBulkPriceStr: '$205.36' },
    },
  ],
};

export const Error = Template.bind({});
Error.args = {
  label: 'Label',
  value: 0,
  status: FeeSelectorStatus.Error,
  options: [
    { id: 0, content: { label: 'Slow', timeStr: '10 hours', feeAmountStr: '0.00031 ETH', feeBulkPriceStr: '$10.40' } },
    {
      id: 1,
      content: { label: 'Instant', timeStr: '7 minutes', feeAmountStr: '0.0061 ETH', feeBulkPriceStr: '$205.36' },
    },
  ],
};

export const Success = Template.bind({});
Success.args = {
  label: 'Label',
  value: 0,
  status: FeeSelectorStatus.Success,
  options: [
    { id: 0, content: { label: 'Slow', timeStr: '10 hours', feeAmountStr: '0.00031 ETH', feeBulkPriceStr: '$10.40' } },
    {
      id: 1,
      content: { label: 'Instant', timeStr: '7 minutes', feeAmountStr: '0.0061 ETH', feeBulkPriceStr: '$205.36' },
    },
  ],
};
