import Cookie from 'js-cookie';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Text } from '../ui';
import { breakpoints, fontSizes, lineHeights, spacings } from '../../styles';

const Form = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: ${spacings.s} 0;
  padding: ${spacings.xs} ${spacings.m};
  background: rgba(255, 255, 255, 0.2);
  border-radius: 40px;

  @media (max-width: ${breakpoints.s}) {
    flex-wrap: wrap;
    justify-content: center;
    margin: 0 -${spacings.xs};
  }
`;

const Col = styled.div`
  flex: 1 1 auto;

  @media (max-width: ${breakpoints.s}) {
    text-align: center;
  }
`;

const ButtonCol = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const ElemWrapper = styled.div`
  padding: ${spacings.s};

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.xs};
  }
`;

const StyledContent = styled(Text)`
  font-size: ${fontSizes.s};
  line-height: ${lineHeights.m};
  font-weight: 300;
  color: white;

  @media (max-width: ${breakpoints.s}) {
    font-size: ${fontSizes.s};
    line-height: ${lineHeights.s};
  }
`;

const GradientText = styled(Text)`
  background: linear-gradient(101.14deg, #940dff 11.12%, #0094ff 58.22%, #0094ff 58.22%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const CookiesForm: React.FunctionComponent = () => {
  const [accepted, setAccepted] = useState(Cookie.get('accepted'));

  if (accepted === 'true') {
    return null;
  }

  const acceptCookies = () => {
    Cookie.set('accepted', 'true');
    setAccepted('true');
  };

  return (
    <Form>
      <Col>
        <ElemWrapper>
          <StyledContent text="This website uses cookies to enhance to user experience. Learn more in our Privacy Policy." />
        </ElemWrapper>
      </Col>
      <ButtonCol>
        <ElemWrapper>
          <Button
            theme="white"
            parentBackground={'rgba(255,255,255, 0.2)'}
            href="https://aztec.network/privacy/"
            target="_blank"
          >
            <GradientText text="LEARN MORE" />
          </Button>
        </ElemWrapper>
        <ElemWrapper>
          <Button theme="default" text="ACCEPT" onClick={acceptCookies} />
        </ElemWrapper>
      </ButtonCol>
    </Form>
  );
};
