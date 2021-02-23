import { createGlobalStyle } from 'styled-components';
import { reset } from 'styled-reset';
import sohneBuch from './fonts/soehne-web-buch.woff2';
import sohneHalbfett from './fonts/soehne-web-halbfett.woff2';
import sohneLeicht from './fonts/soehne-web-leicht.woff2';
import sohneLeichtKursiv from './fonts/soehne-leicht-kursiv.ttf';
import sohneMonoBuch from './fonts/soehne-mono-buch.woff';
import sohneMonoLeicht from './fonts/soehne-mono-leicht.woff';
import sohneMonoHalbfett from './fonts/soehne-mono-halbfett.ttf';
import { fontFamily, fontSizes } from './styles';

export const GlobalStyle = createGlobalStyle`
  ${reset}

  @font-face {
    font-family: Sohne;
    font-style: normal;
    font-weight: 400;
    src: url(${sohneLeicht});
  }

  @font-face {
    font-family: Sohne;
    font-style: normal;
    font-weight: 450;
    src: url(${sohneBuch});
  }

  @font-face {
    font-family: Sohne;
    font-style: normal;
    font-weight: 500;
    src: url(${sohneHalbfett});
  }

  @font-face {
    font-family: Sohne;
    font-style: italic;
    font-weight: 400;
    src: url(${sohneLeichtKursiv});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 400;
    src: url(${sohneMonoLeicht});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 450;
    src: url(${sohneMonoBuch});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 500;
    src: url(${sohneMonoHalbfett});
  }

  body {
    width: 100%;
    font-family: ${fontFamily.base};
    font-size: ${fontSizes.m};
  }

  a {
    text-decoration: none;
  }

  * {
    box-sizing: border-box;
  }
`;
