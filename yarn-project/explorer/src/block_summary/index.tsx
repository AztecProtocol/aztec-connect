import React from 'react';
import summaryIcon from '../images/cube.svg';
import { InfoContent } from '../template/index.js';
import { InfoRowOffset } from './info_row.js';

export * from './info_row.js';
export * from './hash_value.js';
export * from './timestamp.js';
export * from './value.js';

interface BlockSummaryProps {
  className?: string;
  title: string;
  subtitle?: string;
  titleContent?: React.ReactNode;
  children: React.ReactNode;
}

export const BlockSummary: React.FunctionComponent<BlockSummaryProps> = ({
  className,
  title,
  subtitle,
  titleContent,
  children,
}) => (
  <InfoContent
    className={className}
    theme="primary"
    titleIcon={summaryIcon}
    caption="SUMMARY"
    title={title}
    subtitle={subtitle}
    titleContent={titleContent}
  >
    <InfoRowOffset>{children}</InfoRowOffset>
  </InfoContent>
);
