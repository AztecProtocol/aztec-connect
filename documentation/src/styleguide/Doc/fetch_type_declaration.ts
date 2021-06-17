export const fetchTypeDeclaration = (srcName: string) => {
  const [, packageName, filePath] = srcName.match(/^(@aztec\/sdk|barretenberg|blockchain)\/(.+)\.d\.ts$/) || [];
  // Need to specify module name and file extension in require() or it will import all the files in node_modules.
  switch (packageName) {
    case '@aztec/sdk':
      return require(`!!raw-loader!../../../node_modules/@aztec/sdk/${filePath}.d.ts`).default;
    case 'barretenberg':
      return require(`!!raw-loader!../../../node_modules/@aztec/barretenberg/${filePath}.d.ts`).default;
    case 'blockchain':
      return require(`!!raw-loader!../../../node_modules/@aztec/blockchain/${filePath}.d.ts`).default;
    default:
  }
  return '';
};
