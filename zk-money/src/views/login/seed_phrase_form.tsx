import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, InputTheme, InputWrapper, PaddedBlock, Textarea } from '../../components';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const InputPaddedBlock = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const SeedPhraseInputWrapper = styled(InputWrapper)`
  width: 100%;
  max-width: 420px;
`;

interface SeedPhraseFormProps {
  seedPhrase: string;
  setSeedPhrase: (seedPhrase: string) => void;
  onSubmit: (seedPhrase: string) => void;
  hasError: boolean;
}

export const SeedPhraseForm: React.FunctionComponent<SeedPhraseFormProps> = ({
  seedPhrase,
  setSeedPhrase,
  onSubmit,
  hasError,
}) => {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasError && submitting) {
      setSubmitting(false);
    }
  }, [hasError, submitting]);

  const handleSubmit = () => {
    if (!submitting) {
      setSubmitting(true);
      onSubmit(seedPhrase);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Root>
      <InputPaddedBlock>
        <SeedPhraseInputWrapper theme={InputTheme.LIGHT}>
          <Textarea
            theme={InputTheme.LIGHT}
            rows={3}
            value={seedPhrase}
            onChangeValue={setSeedPhrase}
            onKeyDown={handleKeyDown}
            placeholder="Enter your seed phrase..."
            textAlign="center"
          />
        </SeedPhraseInputWrapper>
      </InputPaddedBlock>
      <PaddedBlock>
        <Button theme="white" text="Login" onClick={handleSubmit} disabled={!seedPhrase} isLoading={submitting} />
      </PaddedBlock>
    </Root>
  );
};
