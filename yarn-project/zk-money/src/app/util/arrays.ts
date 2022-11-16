export function arrEqual<T>(arr1: T[], arr2: T[]) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

type Redefine<T> = { [K in keyof T]: Exclude<T[K], undefined> };
export function areDefined<T extends Readonly<Array<unknown>>>(arr: T): arr is Redefine<T> {
  return !arr.some(elem => elem === undefined);
}
