export const randomInt = (from?: number, to?: number, rand: () => number = Math.random) => {
  const start = to !== undefined ? from || 0 : 0;
  let offset;
  if (to !== undefined) {
    offset = to - start;
  } else {
    offset = from !== undefined ? from : 2 ** 32;
  }
  return start + Math.floor(rand() * (offset + 1));
};

export const makeRandomInt = (rand: () => number) => (from?: number, to?: number) => randomInt(from, to, rand);
