import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Loader, LoaderSize } from './loader';

export default {
  title: 'Loader',
  component: Loader,
  decorators: [centered],
} as ComponentMeta<typeof Loader>;

const Template: ComponentStory<typeof Loader> = args => <Loader {...args} />;
export const MainLoader = Template.bind({});
MainLoader.args = {
  size: LoaderSize.Medium,
};

const MultipleSizesTemplate: ComponentStory<typeof Loader> = args => (
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '25px' }}>
    <Loader {...args} size={LoaderSize.ExtraSmall} />
    <Loader {...args} size={LoaderSize.Small} />
    <Loader {...args} size={LoaderSize.Medium} />
    <Loader {...args} size={LoaderSize.Large} />
    <Loader {...args} size={LoaderSize.ExtraLarge} />
  </div>
);
export const MultipleSizes = MultipleSizesTemplate.bind({});
MultipleSizes.args = {};
