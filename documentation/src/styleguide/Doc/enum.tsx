import React from 'react';
import Markdown from 'react-styleguidist/lib/client/rsg-components/Markdown';
import chunkify from 'react-styleguidist/lib/loaders/utils/chunkify';
import { parseCommentContent } from './parse_comment';
import { parseEnumDeclaration } from './parse_enum_declaration';
import { fetchTypeDeclaration } from './fetch_type_declaration';

interface EnumProps extends React.HTMLAttributes<HTMLHeadingElement> {
  srcName: string;
  enumName: string;
}

export const Enum: React.FunctionComponent<EnumProps> = ({ srcName, enumName }) => {
  let enumDeclaration = '';
  let inputBuffer = '';
  try {
    inputBuffer = fetchTypeDeclaration(srcName);
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

  const description = parseCommentContent(inputBuffer, enumName, ['export', 'type', 'declare']);
  const descChunks = description ? chunkify(description) : [];

  return (
    <>
      {descChunks.map((chunk, i) => (
        <Markdown key={`md_${i}`} text={chunk.content} />
      ))}
      <Markdown text={chunks[0].content} />
    </>
  );
};
