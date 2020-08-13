export const parseApiCommnet = (content: string, apiName: string) => {
  const reg = RegExp(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/, 'g');
  const fnReg = RegExp(`^(\\s|public|static|async)*${apiName}\\s*\\(`);
  let res;
  while ((res = reg.exec(content)) !== null) {
    if (content.substr(reg.lastIndex + 1).match(fnReg)) {
      return res[0];
    }
  }

  return '';
};
