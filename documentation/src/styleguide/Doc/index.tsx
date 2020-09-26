import { TSDocParser, ParserContext } from '@microsoft/tsdoc';
import React from 'react';
import { parseComment } from './parse_comment';
import { parseDocNode } from './parse_doc_node';
import { parseType } from './parse_type_definition';
import { SpecTable, Spec, SpecType } from './spec_table';
import Description from './description';

export * from './type_definition';
export * from './enum';

interface DocProps extends React.HTMLAttributes<HTMLHeadingElement> {
  srcName: string;
  apiName: string;
}

const removeBackSlashes = (str: string) => str.replace(/\\/g, '');
const parseTypeFromTSDoc = (str: string) => {
  const type = parseType(`return(): ${removeBackSlashes(str.trim())}`);
  return type?.returns || type;
};

export const DocRenderer: React.FunctionComponent<DocProps> = ({ srcName, apiName }) => {
  let parserContext: ParserContext;
  try {
    const inputBuffer: string = require(`!!raw-loader!../../sdk/${srcName}`).default;
    const comment = parseComment(inputBuffer, apiName);
    if (!comment) {
      return null;
    }

    const tsdocParser: TSDocParser = new TSDocParser();
    parserContext = tsdocParser.parseString(comment);
    if (parserContext.log.messages.length) {
      throw new Error(parserContext.log.messages.toString());
    }
  } catch (e) {
    console.error(e);
    return null;
  }

  const docComment = parserContext.docComment;

  const params: Spec[] = [];
  for (const paramBlock of docComment.params.blocks) {
    const paramContent = parseDocNode(paramBlock.content);
    const [_, type, optional, description] = paramContent.trim().match(/^\[([a-z\|]+)\](\?)?\s+([\S\s]+)$/i) || [];
    params.push({
      name: paramBlock.parameterName,
      type: type || '',
      description: description || '',
      optional: !!optional,
    });
  }

  const returnValues: Spec[] = [];
  if (docComment.returnsBlock) {
    const [type, description] = parseDocNode(docComment.returnsBlock.content).split('-');
    returnValues.push({
      name: '',
      type: (type && parseTypeFromTSDoc(type)) || '',
      description: description ? description.trim() : '',
    });
  }

  return (
    <>
      {params.length > 0 && <SpecTable type={SpecType.PARAM} rows={params} />}
      {returnValues.length > 0 && <SpecTable type={SpecType.RETURN} rows={returnValues} />}
      {docComment.remarksBlock && <Description description={parseDocNode(docComment.remarksBlock.content)} />}
    </>
  );
};
