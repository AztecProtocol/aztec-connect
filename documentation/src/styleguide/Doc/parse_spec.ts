export const specTypes = <const>['enum', 'class', 'interface', 'function'];
export type SpecType = typeof specTypes[number];

export const specOptions = <const>['AS_INTERFACE'];
export type SpecOption = typeof specOptions[number];

interface SpecConfig {
  srcName: string;
  name: string;
  isDeclaration: boolean;
  type?: SpecType;
  options?: SpecOption[];
}

export const specPattern = new RegExp(
  `@spec\\s+([\\w@-_\\/]+(.d)?.ts)\\s+(${specTypes.join(
    '|',
  )})?\\s*([a-zA-Z_][a-zA-Z0-9_-]+)\\s*(\\[[A-Z_\\|\\s]+\\])?(\n|$)`,
);

export const parseSpec = (txt: string) => {
  const [match, srcName, dFileExt, decorator, name, optionsStr] = txt.trim().match(specPattern) || [];
  if (!match) {
    return;
  }

  const type = decorator as SpecType;

  const options = optionsStr
    ? optionsStr
        .trim()
        .slice(1, -1)
        .split('|')
        .map(s => {
          const option = s.trim() as SpecOption;
          if (specOptions.indexOf(option) < 0) {
            console.warn(`Unknown spec option: ${option}. Should be one of [${specOptions.join(' | ')}]`);
          }
          return option;
        })
    : undefined;

  const config: SpecConfig = {
    srcName,
    name,
    isDeclaration: !!dFileExt,
    type,
    options,
  };

  return config;
};
