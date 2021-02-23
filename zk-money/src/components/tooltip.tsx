import { rgba } from 'polished';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { borderRadiuses, colours, spacings } from '../styles';

type TooltipPivot = 'topcenter' | 'topright';

const popoverStyles: { [key in TooltipPivot]: any } = {
  topcenter: css`
    top: -${spacings.xs};
    left: 50%;
    transform: translate(-50%, -100%);
  `,
  topright: css`
    top: -${spacings.xs};
    right: -${spacings.xs};
    transform: translate(0, -100%);
  `,
};

const Root = styled.div`
  position: relative;
`;

interface PopoverProps {
  pivot: TooltipPivot;
}

const Popover = styled.div<PopoverProps>`
  position: absolute;
  padding: ${spacings.xs} ${spacings.s};
  background: ${rgba(colours.black, 0.9)};
  border-radius: ${borderRadiuses.s};
  color: ${colours.white};
  z-index: 9;
  ${({ pivot }) => popoverStyles[pivot]}
`;

interface TooltipProps {
  className?: string;
  trigger: React.ReactNode;
  pivot?: TooltipPivot;
}

export const Tooltip: React.FunctionComponent<TooltipProps> = ({
  className,
  trigger,
  pivot = 'topcenter',
  children,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <Root className={className} onMouseEnter={() => setShowPopover(true)} onMouseLeave={() => setShowPopover(false)}>
      {showPopover && <Popover pivot={pivot}>{children}</Popover>}
      {trigger}
    </Root>
  );
};
