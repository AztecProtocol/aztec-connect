export const filterUndefined = <T>(ts: (T | undefined)[]): T[] => ts.filter((t: T | undefined): t is T => !!t);
