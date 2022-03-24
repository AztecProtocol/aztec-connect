import React from 'react';
import { Breadcrumb, Breadcrumbs, DeviceWidth } from '../components';
import { Breakpoint, sizeLte } from '../styles';

const getBreadcrumbSize = (count: number, breakpoint: Breakpoint) => {
  if (count > 2) {
    return sizeLte(breakpoint, 'm') ? 'm' : 'l';
  }
  return sizeLte(breakpoint, 's') ? 'm' : 'l';
};

export interface SectionTitleProps {
  className?: string;
  breadcrumbs: Breadcrumb[];
}

export const SectionTitle: React.FunctionComponent<SectionTitleProps> = ({ className, breadcrumbs }) => (
  <DeviceWidth>
    {({ breakpoint }) => (
      <Breadcrumbs
        className={className}
        breadcrumbs={breadcrumbs}
        size={getBreadcrumbSize(breadcrumbs.length, breakpoint)}
      />
    )}
  </DeviceWidth>
);
