import { DocNode, DocExcerpt } from '@microsoft/tsdoc';

export const parseDocNode = (docNode: DocNode) => {
  if (!docNode) {
    return '';
  }

  if (docNode instanceof DocExcerpt) {
    return docNode.content.toString();
  }

  let result: string = '';
  for (const childNode of docNode.getChildNodes()) {
    result += parseDocNode(childNode);
  }
  return result;
};

export const parseDocNodes = (docNodes: ReadonlyArray<DocNode>) => {
  let result: string = '';
  for (const docNode of docNodes) {
    result += parseDocNode(docNode);
  }
  return result;
};
