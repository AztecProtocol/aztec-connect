import React from 'react';
import Markdown from 'react-styleguidist/lib/client/rsg-components/Markdown';
import chunkify from 'react-styleguidist/lib/loaders/utils/chunkify';
import { parseEnumDeclaration } from './parse_enum_declaration';

interface EnumProps extends React.HTMLAttributes<HTMLHeadingElement> {
  srcName: string;
  enumName: string;
}

export const Enum: React.FunctionComponent<EnumProps> = ({ srcName, enumName }) => {
  let enumDeclaration = '';
  try {
    const [packageName, ...filePath] = srcName.split('/');
    let inputBuffer = '';
    switch (packageName) {
      case 'aztec2-sdk':
        inputBuffer = require(`!!raw-loader!../../../node_modules/aztec2-sdk/${filePath.join('/').slice(0, -5)}.d.ts`)
          .default;
        break;
      case 'barretenberg':
        inputBuffer = require(`!!raw-loader!../../../node_modules/barretenberg/${filePath.join('/').slice(0, -5)}.d.ts`)
          .default;
        break;
      default:
    }
    enumDeclaration = parseEnumDeclaration(inputBuffer, enumName);
  } catch (e) {
    console.error(e);
    return null;
  }

  if (!enumDeclaration) {
    return null;
  }

  const chunks = chunkify(`\`\`\`ts static
${enumDeclaration}
\`\`\``);

  return <Markdown text={chunks[0].content} />;
};
