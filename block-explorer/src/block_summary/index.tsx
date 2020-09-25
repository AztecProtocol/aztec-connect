import React from 'react';
import summaryIcon from '../images/cube.svg';
import { InfoContent } from '../template';
import { InfoRowOffset } from './info_row';

export * from './info_row';
export * from './hash_value';
export * from './timestamp';
export * from './value';

interface BlockSummaryProps {
  className?: string;
  title: string;
  titleContent?: React.ReactNode;
  children: React.ReactNode;
}

export const BlockSummary: React.FunctionComponent<BlockSummaryProps> = ({
  className,
  title,
  titleContent,
  children,
}) => (
  <InfoContent
    className={className}
    theme="primary"
    titleIcon={summaryIcon}
    caption="SUMMARY"
    title={title}
    titleContent={titleContent}
  >
    <InfoRowOffset>{children}</InfoRowOffset>
  </InfoContent>
);
