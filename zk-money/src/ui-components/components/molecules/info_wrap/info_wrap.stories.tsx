import { ComponentStory, ComponentMeta } from '@storybook/react';

import { InfoWrap } from './info_wrap';

export default {
  title: 'Molecules/InfoWrap',
  component: InfoWrap,
} as ComponentMeta<typeof InfoWrap>;

const Template: ComponentStory<typeof InfoWrap> = args => {
  return (
    <div
      style={{
        height: 200,
        width: 200,
        // display: 'grid'
      }}
    >
      <InfoWrap {...args} />
    </div>
  );
};

export const Example = Template.bind({});
Example.args = {
  showingInfo: true,
  onHideInfo: () => {
    console.log('cloick');
  },
  infoHeader: 'Header',
  infoContent:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer luctus, nisl sit amet feugiat mollis, enim turpis feugiat mauris, id auctor metus arcu vel ipsum. Cras eget tempus sapien. Nullam lorem lorem, interdum vel maximus tempus, fringilla id purus. Aenean pellentesque ex sapien, vel hendrerit magna molestie a.',
  children: 'I will get covered by the wrap',
};
