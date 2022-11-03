type StyleModule = { [key: string]: string };

export function bindStyle(style: StyleModule) {
  return function cx(...args: unknown[]) {
    const attemptAdd = (arg: unknown) => {
      switch (typeof arg) {
        case 'bigint':
        case 'number':
        case 'string': {
          const name = arg.toString();
          active.add(style[name] || name);
        }
      }
    };
    const active = new Set<string>();
    for (const arg of args) {
      if (typeof arg === 'object') {
        if (Array.isArray(arg)) {
          for (const elem of arg) attemptAdd(elem);
        } else {
          for (const key in arg) {
            if (arg[key as keyof typeof arg]) attemptAdd(key);
          }
        }
      } else {
        attemptAdd(arg);
      }
    }
    return Array.from(active).join(' ');
  };
}
