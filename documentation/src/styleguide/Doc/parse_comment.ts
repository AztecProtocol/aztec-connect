export const parseComment = (content: string, apiName: string, decorators = ['public', 'static', 'async']) => {
  const reg = RegExp(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/, 'g');
  const fnReg = RegExp(`^(${['\\s', ...decorators].join('|')})*${apiName}(\\s|\\()+`);
  let res;
  while ((res = reg.exec(content)) !== null) {
    if (content.substr(reg.lastIndex + 1).match(fnReg)) {
      return res[0];
    }
  }

  return '';
};

export const parseCommentContent = (inputBuffer: string, apiName: string, decorators?: string[]) => {
  const comment = parseComment(inputBuffer, apiName, decorators);
  if (!comment) {
    return '';
  }

  return comment
    .split(/\n/g)
    .map(line => line.replace(/^\s*\/?\*+\/?\s*/, ''))
    .join(' ')
    .trim();
};
