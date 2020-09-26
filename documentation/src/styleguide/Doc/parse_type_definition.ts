import { Type } from './type';

const notEmpty = <T>(value: T | undefined): value is T => !!value;

export const destructParamsStr = (def: string): string[] => {
  const params = [];
  let startAt = 0;
  let cur = 0;
  let depth = 0;
  while (cur < def.length) {
    switch (def[cur]) {
      case ',': {
        if (!depth) {
          params.push(def.substring(startAt, cur));
          do {
            cur++;
            startAt = cur;
          } while (!def[cur].trim());
          cur--;
        }
        break;
      }
      case '(':
      case '{':
        depth++;
        break;
      case ')':
      case '}':
        depth--;
        break;
      default:
    }
    cur++;
  }
  if (startAt < def.length) {
    params.push(def.substr(startAt));
  }
  return params;
};

export const destructFunctionStr = (fn: string) => {
  let depth = 0;
  let cutAt = 0;
  for (let i = 1; i < fn.length; ++i) {
    if (fn[i] === ')') {
      if (!depth) {
        cutAt = i + 1;
        break;
      }
      depth--;
    } else if (fn[i] === '(') {
      depth++;
    }
  }
  const paramsStr = fn.substring(0, cutAt).trim().slice(1, -1);
  const returnsStr = fn.substr(cutAt).replace(/^\s*=>\s*/, '');
  return { paramsStr, returnsStr };
};

const parseParams = (paramsStr: string) => destructParamsStr(paramsStr).map(parseType).filter(notEmpty);

export const parseFunction = (def: string): Type => {
  const [, name, fn] = def.match(/^(\w+:)?\s*(\(.+)$/) || [];
  const { paramsStr, returnsStr } = destructFunctionStr(fn);
  const returnType = parseType(`() => ${returnsStr}`);
  return {
    name: (name && name.replace(/:$/, '')) || '',
    type: 'function',
    params: parseParams(paramsStr),
    returns: (returnType && returnType.returns) || returnsStr,
  };
};

const parseObjectParams = (def: string): Type[] =>
  def
    .slice(1, -1)
    .split(';')
    .map(t => parseType(t.trim()))
    .filter(notEmpty);

export const parseType = (def: string): Type | undefined => {
  const [match, decoratorsStr, _, name, paramsStr, returnsStr] =
    def
      .replace(/import\(".*"\)\./g, '')
      .match(/^((public |private |static |readonly )*)?(\w+\??)(\(.*\))?(: .+)?;?$/) || [];
  if (!match) return;

  const decorators = decoratorsStr ? decoratorsStr.trim().split(' ') : undefined;

  const params = paramsStr && paramsStr.trim() ? parseParams(paramsStr.trim().slice(1, -1)) : undefined;

  let returns: string | Type = returnsStr && returnsStr.slice(2).replace(/;$/, '');
  if (returns) {
    if (returns.match(/^\((.*)\) => .+$/)) {
      returns = parseFunction(returns);
    } else if (returns.match(/^{.+}$/)) {
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
    isStatic: (decorators && decorators.indexOf('static') >= 0) || undefined,
    isPrivate: (decorators && decorators.indexOf('private') >= 0) || undefined,
    isReadonly: (decorators && decorators.indexOf('readonly') >= 0) || undefined,
  };
};

export const parseTypeDefinition = (content: string, typeName: string, decorator?: string) => {
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const defReg = RegExp(`^export.*\\s${decorator ? `${decorator}\\s` : ''}${typeName}\\s.*{$`);
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
