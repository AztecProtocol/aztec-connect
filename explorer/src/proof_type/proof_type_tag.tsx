import { ProofId } from '@aztec/sdk';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';
import { Text } from '../components';
import { colours, spacings, borderRadius } from '../styles';

const proofTypeColours = {
  [ProofId.PADDING]: colours.greyDark,
  [ProofId.DEPOSIT]: colours.blue,
  [ProofId.WITHDRAW]: colours.blue,
  [ProofId.SEND]: colours.blue,
  [ProofId.ACCOUNT]: colours.orange,
  [ProofId.DEFI_DEPOSIT]: colours.green,
  [ProofId.DEFI_CLAIM]: colours.green,
};

export const proofTypeNames = {
  [ProofId.PADDING]: 'PADDING',
  [ProofId.DEPOSIT]: 'DEPOSIT',
  [ProofId.WITHDRAW]: 'WITHDRAW',
  [ProofId.SEND]: 'SEND',
  [ProofId.ACCOUNT]: 'ACCOUNT',
  [ProofId.DEFI_DEPOSIT]: 'DEFI DEPOSIT',
  [ProofId.DEFI_CLAIM]: 'DEFI CLAIM',
};

interface ProofTypeTagProps {
  proofId: ProofId;
}

const ProofTypeTagRoot = styled(Text)`
  display: inline-block;
  padding: 0 ${spacings.xs};
  color: ${({ proofId }: ProofTypeTagProps) => proofTypeColours[proofId]};
  background: ${({ proofId }: ProofTypeTagProps) => rgba(proofTypeColours[proofId], 0.2)};
  border-radius: ${borderRadius};
  text-align: center;
  letter-spacing: 1px;
  white-space: nowrap;
`;

interface ProofTypeTagProps {
  className?: string;
  proofId: ProofId;
}

export const ProofTypeTag: React.FunctionComponent<ProofTypeTagProps> = ({ className, proofId }) => (
  <ProofTypeTagRoot className={className} proofId={proofId} text={proofTypeNames[proofId]} size="s" weight="semibold" />
);
