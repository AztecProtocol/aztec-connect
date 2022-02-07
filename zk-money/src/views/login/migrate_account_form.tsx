import React, { useEffect, useState } from 'react';
import styled from 'styled-components/macro';
import { Button, PaddedBlock, Text, TextLink } from '../../components';
import { borderRadiuses, gradients, spacings } from '../../styles';

const Root = styled.div`
  text-align: center;
`;

const AliasRoot = styled.div`
  padding: ${spacings.s};
  border-radius: ${borderRadiuses.l};
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
`;

const ButtonRoot = styled.div`
  display: flex;
  justify-content: center;
`;

const FooterRoot = styled.div`
  padding-top: ${spacings.l};
`;

const Disclaimer = styled.div`
  padding-top: ${spacings.m};
`;

interface MigrateAccountFormProps {
  alias: string;
  onMigrateAccount(): void;
  hasError: boolean;
}

export const MigrateAccountForm: React.FunctionComponent<MigrateAccountFormProps> = ({
  alias,
  onMigrateAccount,
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
      onMigrateAccount();
    }
  };

  return (
    <Root>
      <PaddedBlock>
        <AliasRoot>{`@${alias}`}</AliasRoot>
      </PaddedBlock>
      <FooterRoot>
        <ButtonRoot>
          <Button theme="white" text="Migrate account" onClick={handleSubmit} isLoading={submitting} />
        </ButtonRoot>
        <Disclaimer>
          <Text size="xxs">
            {'By clicking Migrate account, you agree to the '}
            <TextLink text="Terms and Conditions" color="white" target="_blank" href="" underline inline />
            {'.'}
          </Text>
        </Disclaimer>
      </FooterRoot>
    </Root>
  );
};
