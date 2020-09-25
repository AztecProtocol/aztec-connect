import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Text, TextLink } from '../components';
import { borderRadius, spacings, colours, systemStates, fontSizes, lineHeights, breakpoints } from '../styles';

const FORM_ACTION =
  'https://aztecprotocol.us7.list-manage.com/subscribe/post?u=0f5fa2f22c3349ec01c3d1fdc&amp;id=fe93ec0b0b';

const FORM_CREDENTIAL = 'b_0f5fa2f22c3349ec01c3d1fdc_fe93ec0b0b';

const validateEmail = (value: string) => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    value,
  );
};

const SubscriptionRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${spacings.l} 0;
  width: 100%;
  padding: ${spacings.xxl} ${spacings.xl};
  background: ${colours.greyDark};
  border-radius: ${borderRadius};

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.xl} ${spacings.m};
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacings.s} 0;
  width: 100%;
`;

const Title = styled(Text)`
  font-size: ${fontSizes.l};
  line-height: ${lineHeights.l};

  @media (max-width: ${breakpoints.xs}) {
    font-size: ${fontSizes.m};
    line-height: ${lineHeights.m};
  }
`;

const StyledMessage = styled.div`
  padding: ${spacings.s} 0;
`;

const InputRow = styled(Row)`
  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
  }
`;

const InputRoot = styled.div`
  position: relative;
  flex: 1 1 auto;
  padding-right: ${spacings.m};
  width: 100%;
  max-width: 520px;

  @media (max-width: ${breakpoints.xs}) {
    flex-shrink: 0;
    padding: 0;
  }
`;

const ErrorMessage = styled(Text)`
  position: absolute;
  left: 0;
  bottom: -${spacings.xs};
  transform: translateY(100%);
  color: ${systemStates.error};
`;

const StyledButton = styled(Button)`
  flex-shrink: 0;
  padding-left: ${spacings.xl};
  padding-right: ${spacings.xl};

  @media (max-width: ${breakpoints.xs}) {
    margin: ${spacings.m} 0;
    width: 100%;
  }
`;

const LinksRow = styled(Row)`
  display: flex;

  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
    margin: 0 -${spacings.xs};
  }
`;

const StyledLink = styled(TextLink)`
  margin: ${spacings.s};
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};

  @media (max-width: ${breakpoints.xs}) {
    margin: ${spacings.xs};
    font-size: ${fontSizes.xs};
    line-height: ${lineHeights.xs};
  }
`;

export const SubscriptionForm: React.FunctionComponent = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = () => {
    const value = email.trim();
    if (!value) return;

    if (!validateEmail(value)) {
      setError('Please enter a valid email address.');
    } else {
      formRef.current?.submit();
      setSubscribed(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode !== 13) return;

    e.preventDefault();

    handleSubmit();
  };

  return (
    <SubscriptionRoot>
      <Row>
        <Title text="Stay Up To Date With Aztec" weight="semibold" />
      </Row>
      {!subscribed && (
        <InputRow>
          <InputRoot>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (error) {
                  setError('');
                }
                setEmail(e.target.value!);
              }}
              onKeyDown={handleKeyDown}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {!!error && <ErrorMessage text={error} size="xs" />}
          </InputRoot>
          <StyledButton text="Sign Up" onClick={handleSubmit} />
        </InputRow>
      )}
      {subscribed && (
        <Row>
          <StyledMessage>
            <Text text="Thank you for subscribing!" />
          </StyledMessage>
        </Row>
      )}
      <LinksRow>
        <StyledLink text="Twitter" href="https://twitter.com/aztecprotocol" color="violet" target="_blank" />
        <StyledLink text="Telegram" href="https://t.me/aztecprotocol" color="violet" target="_blank" />
        <StyledLink text="Github" href="https://github.com/AztecProtocol" color="violet" target="_blank" />
        <StyledLink text="PLONK Café" href="https://www.plonk.cafe/" color="violet" target="_blank" />
      </LinksRow>
      <form ref={formRef} method="post" action={FORM_ACTION} target="_blank" style={{ display: 'none' }}>
        <input type="text" name="EMAIL" value={email} readOnly />
        <input type="text" name={FORM_CREDENTIAL} value="" readOnly />
        <input type="submit" />
      </form>
    </SubscriptionRoot>
  );
};
