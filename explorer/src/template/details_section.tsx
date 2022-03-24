import React from 'react';
import { ContentRow, ContentCol, DeviceWidth } from '../components';
import { sizeLt, sizeLte } from '../styles';

interface TxDetailsProps {
  lhsContent: React.ReactNode;
  rhsContent: React.ReactNode;
}

export const DetailsSection: React.FunctionComponent<TxDetailsProps> = ({ lhsContent, rhsContent }) => (
  <DeviceWidth>
    {({ breakpoint }) => {
      const colSize = sizeLte(breakpoint, 'm') ? 's' : 'l';
      const lhsColumn = breakpoint === 'm' ? 54 : sizeLt(breakpoint, 'm') ? 100 : 50;
      const rhsColumn = lhsColumn === 100 ? 100 : 100 - lhsColumn;
      return (
        <ContentRow size={colSize}>
          <ContentCol column={lhsColumn} size={colSize}>
            {lhsContent}
          </ContentCol>
          <ContentCol column={rhsColumn} size={colSize}>
            {rhsContent}
          </ContentCol>
        </ContentRow>
      );
    }}
  </DeviceWidth>
);
