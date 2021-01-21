import React, { useState, useEffect } from 'react';
import { Breakpoint, breakpoints } from '../../styles';

const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];

interface DeviceWidthChildrenProps {
  breakpoint: Breakpoint;
}

interface DeviceWidthProps {
  children: (props: DeviceWidthChildrenProps) => JSX.Element;
}

export const DeviceWidth: React.FunctionComponent<DeviceWidthProps> = ({ children }) => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize, true);
    };
  });

  const breakpointLevel = Object.values(breakpoints).findIndex(v => width <= parseInt(v));
  const breakpoint = breakpointKeys[breakpointLevel] || breakpointKeys[breakpointKeys.length - 1];

  return children({ breakpoint });
};
