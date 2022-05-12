import React from 'react';
import styled from 'styled-components';
import proofDataIcon from '../images/cube.svg';
import { CopyButton, Text } from '../components';
import { breakpoints, spacings } from '../styles';
import { InfoContent } from '../template';

const ProofInfoContent = styled(InfoContent)`
  display: grid;
  grid-template-rows: auto minmax(300px, 1fr);
`;

const ContentRoot = styled.div`
  position: relative;
  margin: 0 -${spacings.s};
  height: 100%;
`;

const ProofContent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 24px;
  padding: 0 ${spacings.s};
  word-break: break-all;
  overflow: auto;

  @media (max-width: ${breakpoints.s}) {
    overflow: hidden;
  }
`;

// This will make sure the copy button won't overlap with proof data.
const TextSpacing = styled(Text)`
  display: inline;
  opacity: 0;
`;

const InlineCopyButtonRoot = styled.div`
  position: absolute;
  right: 20px;
  bottom: 0;
`;

const CopyButtonRoot = styled(InlineCopyButtonRoot)`
  bottom: -24px;

  @media (max-width: ${breakpoints.s}) {
    position: relative;
    bottom: 0;
    text-align: right;
  }
`;

export const ProofDataPlaceholder: React.FunctionComponent = () => (
  <InfoContent theme="secondary" titleIcon={proofDataIcon} caption="DETAIL" title="Proof Data">
    <ProofContent />
  </InfoContent>
);

interface ProofDataProps {
  className?: string;
  proofData: string;
}

export const ProofData: React.FunctionComponent<ProofDataProps> = ({ className, proofData }) => {
  return (
    <ProofInfoContent
      className={className}
      theme="secondary"
      titleIcon={proofDataIcon}
      caption="DETAIL"
      title="Proof Data"
    >
      <ContentRoot>
        <ProofContent>
          <Text size="s" weight="light" monospace>
            {proofData}
          </Text>
        </ProofContent>
        <CopyButtonRoot>
          <CopyButton value={proofData} />
        </CopyButtonRoot>
      </ContentRoot>
    </ProofInfoContent>
  );
};
