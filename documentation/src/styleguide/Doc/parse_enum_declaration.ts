export const parseUnionDeclaration = (content: string, typeName: string) => {
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const unionReg = RegExp(`^\\s*(?:export|declare)+.+type\\s*${typeName}\\s*=\\s*(.*);$`);
  for (const line of lines) {
    const [match, unionContent] = unionReg.exec(line) || [];
    if (match) {
      return `type ${typeName} = ${unionContent};`;
    }
  }

  return '';
};

export const parseEnumDeclaration = (content: string, enumName: string) => {
  const lines = content.split(/\r?\n/);
  const enumReg = RegExp(`^\\s*(?:export|declare)+.+enum\\s*${enumName}\\s*{\\s*$`);
  const startAt = lines.findIndex(line => enumReg.exec(line));
  if (startAt < 0) return parseUnionDeclaration(content, enumName);

  const endAt = lines.slice(startAt + 1).findIndex(line => line.match(/^\s*}\s*$/));
  if (endAt < 0) return '';

  return [`enum ${enumName} {`, ...lines.slice(startAt + 1, startAt + endAt + 2)].join('\n');
};
