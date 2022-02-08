import { ComponentStory, ComponentMeta } from '@storybook/react';

import { VerticalScrollRegion } from './vertical_scroll_region';

export default {
  title: 'Molecules/VerticalScrollRegion',
  component: VerticalScrollRegion,
} as ComponentMeta<typeof VerticalScrollRegion>;

const Template: ComponentStory<typeof VerticalScrollRegion> = args => {
  return (
    <div style={{ height: 100, width: 200 }}>
      <VerticalScrollRegion {...args} />
    </div>
  );
};

export const Example = Template.bind({});
Example.args = {
  children:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer luctus, nisl sit amet feugiat mollis, enim turpis feugiat mauris, id auctor metus arcu vel ipsum. Cras eget tempus sapien. Nullam lorem lorem, interdum vel maximus tempus, fringilla id purus. Aenean pellentesque ex sapien, vel hendrerit magna molestie a.',
};
