import copy from 'copy-to-clipboard';
import { rgba } from 'polished';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { formatSeedPhraseInput, sliceSeedPhrase } from '../../app';
import { Button, Checkbox, InputTheme, InputWrapper, PaddedBlock, Text, Textarea } from '../../components';
import copyIcon from '../../images/copy_white.svg';
import { borderRadiuses, colours, spacings } from '../../styles';

const isTyping = (str0: string, str1: string) => {
  if (str0 === str1 || Math.abs(str0.length - str1.length) !== 1) return false;
  const [short, long] = str0.length <= str1.length ? [str0, str1] : [str1, str0];
  const firstDiff = long.split('').findIndex((c, i) => c !== short[i]);
  return long.substr(firstDiff + 1) === short.substr(firstDiff);
};

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

const CopyButtonRoot = styled.div`
  position: absolute;
  top: ${spacings.xs};
  right: ${spacings.xs};
  cursor: pointer;
`;

const CopyButton = styled.img`
  height: 20px;
`;

const JustCopiedMessage = styled(Text)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  padding: ${spacings.xs} ${spacings.s};
  background: ${rgba(colours.black, 0.9)};
  border-radius: ${borderRadiuses.s};
`;

interface SeedPhraseFormProps {
  seedPhrase: string;
  setSeedPhrase: (seedPhrase: string) => void;
  onSubmit: (seedPhrase: string) => void;
}

export const SeedPhraseForm: React.FunctionComponent<SeedPhraseFormProps> = ({
  seedPhrase,
  setSeedPhrase,
  onSubmit,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    let resetTimeout: number;
    if (justCopied) {
      resetTimeout = window.setTimeout(() => {
        setJustCopied(false);
      }, 1500);
    }

    return () => {
      clearTimeout(resetTimeout);
    };
  }, [justCopied, seedPhrase]);

  const handleCopy = () => {
    copy(formatSeedPhraseInput(seedPhrase));
    setJustCopied(true);
  };

  const handleSubmit = () => {
    if (confirmed) {
      onSubmit(seedPhrase);
    }
  };

  const handleChange = (value: string) => {
    const newSeedPhrase = isTyping(value, seedPhrase) ? value : sliceSeedPhrase(value);
    setSeedPhrase(newSeedPhrase);
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
          <CopyButtonRoot onClick={handleCopy}>
            <CopyButton src={copyIcon} title="Copy seed phrase" />
          </CopyButtonRoot>
          <Textarea
            theme={InputTheme.LIGHT}
            rows={3}
            value={seedPhrase}
            onChangeValue={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your seed phrase..."
            textAlign="center"
          />
          {justCopied && <JustCopiedMessage text="Copied to clipboard" size="xxs" />}
        </SeedPhraseInputWrapper>
      </InputPaddedBlock>
      <PaddedBlock>
        <Checkbox
          theme={InputTheme.LIGHT}
          text="I have stored my seed phrase in a safe place"
          align="right"
          checked={confirmed}
          onChangeValue={setConfirmed}
        />
      </PaddedBlock>
      <PaddedBlock>
        <Button theme="white" text="Next" onClick={handleSubmit} disabled={!seedPhrase || !confirmed} />
      </PaddedBlock>
    </Root>
  );
};
