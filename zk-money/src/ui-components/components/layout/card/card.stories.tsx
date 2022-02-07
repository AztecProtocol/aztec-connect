import { ComponentStory, ComponentMeta } from '@storybook/react';
import { CardHeaderSize } from './card_header';

import { Card } from './card';

export default {
  title: 'Layout/Card',
  component: Card,
} as ComponentMeta<typeof Card>;

const Template: ComponentStory<typeof Card> = args => <Card {...args} />;

export const Example = Template.bind({});
Example.args = {
  cardHeader: 'Card header',
  cardContent: 'Card content',
  headerSize: CardHeaderSize.MEDIUM,
};
