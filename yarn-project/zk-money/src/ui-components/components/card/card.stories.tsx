import centered from '@storybook/addon-centered/react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { CardHeaderSize } from './card_header';

import { Card } from './card';

export default {
  title: 'Card',
  component: Card,
  decorators: [centered],
} as ComponentMeta<typeof Card>;

const Template: ComponentStory<typeof Card> = args => <Card {...args} />;

export const Example = Template.bind({});
Example.args = {
  cardHeader: 'Card header',
  cardContent: (
    <div
      style={{
        width: '450px',
        height: '300px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      Card content
    </div>
  ),
  headerSize: CardHeaderSize.MEDIUM,
};
