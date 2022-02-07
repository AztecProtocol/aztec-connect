import React from 'react';
import styled from 'styled-components/macro';
import { Text, TextButton } from '../../../components';
import checkIcon from '../../../images/check.svg';
import warningIcon from '../../../images/exclamation_mark.svg';
import { gradients, spacings, systemStates } from '../../../styles';

const FeedbackRoot = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: ${spacings.m};
`;

interface FeedbackIconProps {
  type: 'warning' | 'success';
}

const FeedbackIconRoot = styled.div<FeedbackIconProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 64px;
  height: 64px;
  border-radius: 100%;
  user-select: none;
  background: ${({ type }) =>
    type === 'warning'
      ? systemStates.error
      : `linear-gradient(134.14deg, ${gradients.secondary.from} 18.37%, ${gradients.secondary.to} 82.04%)`};
`;

const FeedbackIcon = styled.img`
  height: 32px;
`;

const FeedbackMessage = styled(Text)`
  padding: ${spacings.xs} 0;
  text-align: center;
`;

const FeedbackTitle = styled(FeedbackMessage)`
  padding: ${spacings.s} 0;
`;

const FeedbackDescription = styled(FeedbackMessage)`
  padding: ${spacings.s} 0;
`;

interface FeedbackProps {
  title?: string;
  description?: string;
  buttonText?: string;
  failed?: boolean;
  onClose(): void;
}

export const Feedback: React.FunctionComponent<FeedbackProps> = ({
  title = '',
  description = '',
  buttonText = '(Close Window)',
  failed = false,
  onClose,
}) => (
  <FeedbackRoot>
    <FeedbackIconRoot type={failed ? 'warning' : 'success'}>
      <FeedbackIcon src={failed ? warningIcon : checkIcon} />
    </FeedbackIconRoot>
    {!!title && <FeedbackTitle text={title} size="xl" />}
    {!!description && <FeedbackDescription text={description} size="s" />}
    <TextButton text={buttonText} size="xs" onClick={onClose} />
  </FeedbackRoot>
);
