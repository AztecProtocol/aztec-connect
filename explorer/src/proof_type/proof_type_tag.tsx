import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';
import { Text } from '../components';
import { colours, spacings, borderRadius } from '../styles';
import { ProofType } from './';

const proofTypeColours = {
  JOIN_SPLIT: colours.blue,
  ACCOUNT: colours.orange,
};

const proofTypeNames = {
  JOIN_SPLIT: 'JOIN SPLIT',
  ACCOUNT: 'ACCOUNT',
};

interface ProofTypeTagProps {
  proofType: ProofType;
}

const ProofTypeTagRoot = styled(Text)`
  display: inline-block;
  padding: 0 ${spacings.xs};
  color: ${({ proofType }: ProofTypeTagProps) => proofTypeColours[proofType]};
  background: ${({ proofType }: ProofTypeTagProps) => rgba(proofTypeColours[proofType], 0.2)};
  border-radius: ${borderRadius};
  text-align: center;
  letter-spacing: 1px;
  white-space: nowrap;
`;

interface ProofTypeTagProps {
  className?: string;
  proofType: ProofType;
}

export const ProofTypeTag: React.FunctionComponent<ProofTypeTagProps> = ({ className, proofType }) => (
  <ProofTypeTagRoot
    className={className}
    proofType={proofType}
    text={proofTypeNames[proofType]}
    size="s"
    weight="semibold"
  />
);
