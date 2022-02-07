import Cookie from 'js-cookie';
import React, { useState } from 'react';
import styled from 'styled-components/macro';
import { borderRadiuses, breakpoints, fontSizes, lineHeights, spacings, Theme } from '../styles';
import { Button } from './button';
import { Text } from './text';

export const isCookieAccepted = () => Cookie.get('accepted');

const whiteThemeBackground = '#f0f0f3';
const gradientThemeBackground = 'linear-gradient(101.14deg, #9b50ff 0%, #70b4ff 58%)';

interface FormProps {
  theme: Theme;
}

const Form = styled.div<FormProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.xs} ${spacings.m};
  ${({ theme }) => {
    switch (theme) {
      case Theme.WHITE:
        return `background: ${whiteThemeBackground};`;
      case Theme.GRADIENT:
        return `background: ${gradientThemeBackground};`;
      default:
        return '';
    }
  }};
  border-radius: ${borderRadiuses.l};

  @media (max-width: ${breakpoints.m}) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const Col = styled.div`
  flex: 1 1 auto;

  @media (max-width: ${breakpoints.m}) {
    text-align: center;
  }
`;

const ButtonCol = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const ElemWrapper = styled.div`
  padding: ${spacings.s};

  @media (max-width: ${breakpoints.m}) {
    padding: ${spacings.xs};
  }
`;

const StyledContent = styled(Text)`
  font-size: ${fontSizes.s};
  line-height: ${lineHeights.m};

  @media (max-width: ${breakpoints.m}) {
    font-size: ${fontSizes.s};
    line-height: ${lineHeights.s};
  }
`;

interface CookiesFormProps {
  theme: Theme;
  onClose?: () => void;
}

export const CookiesForm: React.FunctionComponent<CookiesFormProps> = ({ theme, onClose }) => {
  const [accepted, setAccepted] = useState(isCookieAccepted());

  if (accepted === 'true') {
    return null;
  }

  const acceptCookies = () => {
    Cookie.set('accepted', 'true');
    setAccepted('true');
    onClose && onClose();
  };

  return (
    <Form theme={theme}>
      <Col>
        <ElemWrapper>
          <StyledContent text="This website uses cookies to enhance to user experience. Learn more in our Privacy Policy." />
        </ElemWrapper>
      </Col>
      <ButtonCol>
        <ElemWrapper>
          <Button
            theme={theme === Theme.WHITE ? 'gradient' : 'white'}
            outlined={theme === Theme.WHITE}
            parentBackground={whiteThemeBackground}
            href="https://aztec.network/privacy/"
            target="_blank"
            text="LEARN MORE"
          />
        </ElemWrapper>
        <ElemWrapper>
          <Button theme="gradient" text="ACCEPT" onClick={acceptCookies} />
        </ElemWrapper>
      </ButtonCol>
    </Form>
  );
};
