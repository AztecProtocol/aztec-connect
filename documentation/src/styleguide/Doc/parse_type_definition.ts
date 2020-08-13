import { Type } from './type';

const notEmpty = <T>(value: T | undefined): value is T => !!value;

const parseObjectParams = (def: string): Type[] =>
  def
    .slice(2, -2)
    .split(';')
    .map(t => parseType(t.trim()))
    .filter(notEmpty);

export const parseType = (def: string): Type | undefined => {
  const [match, decoratorsStr, _, name, paramsStr, returnsStr] =
    def.match(/^((public |private |static )*)?(\w+\??)(\(.*\))?(: .+)?;?$/) || [];
  if (!match) return;

  const decorators = decoratorsStr ? decoratorsStr.trim().split(' ') : undefined;

  const params =
    paramsStr && paramsStr.trim()
      ? paramsStr.trim().slice(1, -1).split(', ').map(parseType).filter(notEmpty)
      : undefined;

  let returns: string | Type =
    returnsStr &&
    returnsStr
      .slice(2)
      .replace(/;$/, '')
      .replace(/import\(".*"\)\./g, '');
  if (returns) {
    if (returns.match(/^{.+}$/)) {
      returns = {
        name: '',
        type: 'object',
        params: parseObjectParams(returns),
      };
    } else {
      const [, isPromise, promiseContent] = returns.match(/^(Promise<)(.+)>$/) || [];
      if (isPromise) {
        returns = {
          name: '',
          type: 'promise',
          returns: promiseContent.match(/^{.+}$/)
            ? {
                name: '',
                type: 'object',
                params: parseObjectParams(promiseContent),
              }
            : promiseContent,
        };
      }
    }
  }

  return {
    name,
    params,
    type: !params ? returns || 'any' : 'function',
    returns: params ? returns || 'void' : undefined,
    isStatic: decorators ? decorators.indexOf('static') >= 0 : undefined,
    isPrivate: decorators ? decorators.indexOf('private') >= 0 : undefined,
  };
};

export const parseTypeDefinition = (content: string, typeName: string) => {
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const defReg = RegExp(`^export.+\\s${typeName}\\s.*{$`);
  const startAt = lines.findIndex(line => defReg.exec(line));
  const types: Type[] = [];
  if (startAt < 0) return types;

  let nested = 0;
  const accumTypes = [];
  for (let i = startAt + 1; i < lines.length; ++i) {
    if (lines[i].match(/^\}>?;?$/)) {
      if (!nested) break;

      nested--;
      accumTypes.push(lines[i]);
    } else if (lines[i].match(/\{$/)) {
      nested++;
      accumTypes.push(lines[i]);
    } else {
      accumTypes.push(lines[i]);
    }

    if (!nested) {
      const type = parseType(accumTypes.splice(0, accumTypes.length).join(' '));
      if (type) {
        types.push(type);
      }
    }
  }

  return types;
};
