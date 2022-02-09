import { ComponentStory, ComponentMeta } from '@storybook/react';
import { useState } from 'react';

import { VerticalScrollBar } from './vertical_scroll_bar';

export default {
  title: 'Atoms/VerticalScrollBar',
  component: VerticalScrollBar,
} as ComponentMeta<typeof VerticalScrollBar>;

const Template: ComponentStory<typeof VerticalScrollBar> = args => {
  return (
    <div style={{ height: 100 }}>
      <VerticalScrollBar {...args} />
    </div>
  );
};

export const Example = Template.bind({});
Example.args = { viewHeight: 100, contentHeight: 300, onDragTo: () => {} };
