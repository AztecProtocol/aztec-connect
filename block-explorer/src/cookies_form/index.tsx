import Cookie from 'js-cookie';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Text } from '../components';
import { borderRadius, breakpoints, colours, fontSizes, gradients, lineHeights, spacings } from '../styles';

const Form = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 -${spacings.s};
  padding: ${spacings.xs} 0;
  border-radius: ${borderRadius};

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
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};

  @media (max-width: ${breakpoints.s}) {
    font-size: ${fontSizes.s};
    line-height: ${lineHeights.s};
  }
`;

const GradientText = styled(Text)`
  background: linear-gradient(164deg, ${gradients.primary.from}, ${gradients.primary.to});
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
          <Button theme="outlined" parentBackground={colours.greyDark} href="#">
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
