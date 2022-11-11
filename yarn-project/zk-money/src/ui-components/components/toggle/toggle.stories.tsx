import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Toggle, ToggleSize } from './toggle';

export default {
  title: 'Toggle',
  component: Toggle,
  decorators: [centered],
} as ComponentMeta<typeof Toggle>;

const Template: ComponentStory<typeof Toggle> = args => <Toggle {...args} />;

export const Example = Template.bind({});
Example.args = {
  value: 'test',
  onChangeValue: () => {},
  options: [
    {
      value: 'test',
      label: 'Label 1',
    },
    {
      value: 'test2',
      label: 'Label 2',
    },
  ],
};

export const WithSublabels = Template.bind({});
WithSublabels.args = {
  value: 'test',
  onChangeValue: () => {},
  options: [
    {
      value: 'test',
      label: 'Label 1',
      sublabel: 'Sublabel 1',
    },
    {
      value: 'test2',
      label: 'Label 2',
      sublabel: 'Sublabel 2',
    },
  ],
};

const SeveralSizesTemplate: ComponentStory<typeof Toggle> = args => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <Toggle
      {...args}
      size={ToggleSize.Small}
      options={[
        {
          value: 'test',
          label: 'Label 1',
        },
        {
          value: 'test2',
          label: 'Label 2',
        },
      ]}
    />
    <Toggle
      {...args}
      size={ToggleSize.Medium}
      options={[
        {
          value: 'test',
          label: 'Label 1',
        },
        {
          value: 'test2',
          label: 'Label 2',
        },
        {
          value: 'test3',
          label: 'Label 3',
        },
      ]}
    />
    <Toggle
      {...args}
      size={ToggleSize.Large}
      options={[
        {
          value: 'test',
          label: 'Label 1',
        },
        {
          value: 'test2',
          label: 'Label 2',
        },
        {
          value: 'test3',
          label: 'Label 3',
        },
        {
          value: 'test4',
          label: 'Label 4',
        },
      ]}
    />
  </div>
);
export const SeveralSizes = SeveralSizesTemplate.bind({});
SeveralSizes.args = {
  value: 'test',
  onChangeValue: () => {},
};
