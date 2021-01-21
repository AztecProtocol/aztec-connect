import { createGlobalStyle } from 'styled-components';
import { reset } from 'styled-reset';
import sohneBuch from './fonts/soehne-web-halbfett.woff2';
import sohneHalbfett from './fonts/soehne-halbfett.ttf';
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
    src: url(${sohneBuch});
  }

  @font-face {
    font-family: Sohne;
    font-style: normal;
    font-weight: 300;
    src: url(${sohneLeicht});
  }

  @font-face {
    font-family: Sohne;
    font-style: italic;
    font-weight: 300;
    src: url(${sohneLeichtKursiv});
  }

  @font-face {
    font-family: Sohne;
    font-style: normal;
    font-weight: 500;
    src: url(${sohneHalbfett});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 400;
    src: url(${sohneMonoBuch});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 300;
    src: url(${sohneMonoLeicht});
  }

  @font-face {
    font-family: 'Sohne Mono';
    font-style: normal;
    font-weight: 500;
    src: url(${sohneMonoHalbfett});
  }

  body {
    background: linear-gradient(101.14deg, #940DFF 11.12%, #0094FF 58.22%, #0094FF 58.22%);
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
