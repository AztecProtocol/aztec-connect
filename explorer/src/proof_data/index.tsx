import React from 'react';
import styled from 'styled-components';
import proofDataIcon from '../images/cube.svg';
import { CopyButton, Text } from '../components';
import { breakpoints, spacings } from '../styles';
import { InfoContent } from '../template';

const ContentRoot = styled.div`
  position: relative;
  margin: 0 -${spacings.s};
`;

interface ProofContentProps {
  height?: number;
}

const ProofContent = styled.div`
  padding: 0 ${spacings.s};
  ${({ height }: ProofContentProps) => !!height && `height: ${height}px;`}
  word-break: break-all;
  overflow: scroll;

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

interface ProofDataPlaceholderProps {
  height?: number;
}

export const ProofDataPlaceholder: React.FunctionComponent<ProofDataPlaceholderProps> = ({ height }) => (
  <InfoContent theme="secondary" titleIcon={proofDataIcon} caption="DETAIL" title="Proof Data">
    <ProofContent height={height} />
  </InfoContent>
);

interface ProofDataProps {
  className?: string;
  proofData: string;
  height?: number;
}

export const ProofData: React.FunctionComponent<ProofDataProps> = ({ className, proofData, height }) => {
  return (
    <InfoContent className={className} theme="secondary" titleIcon={proofDataIcon} caption="DETAIL" title="Proof Data">
      <ContentRoot>
        <ProofContent height={height}>
          <Text size="s" weight="light" monospace>
            {!height ? `${proofData} ` : proofData}
            {!height && <TextSpacing text=".." size="s" weight="light" monospace />}
          </Text>
        </ProofContent>
        {!height && (
          <InlineCopyButtonRoot>
            <CopyButton value={proofData} />
          </InlineCopyButtonRoot>
        )}
        {!!height && (
          <CopyButtonRoot>
            <CopyButton value={proofData} />
          </CopyButtonRoot>
        )}
      </ContentRoot>
    </InfoContent>
  );
};
