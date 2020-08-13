export const randomInt = (from?: number, to?: number, rand: () => number = Math.random) => {
  const start = to !== undefined && from !== undefined ? from : 0;
  let offset;
  if (to !== undefined) {
    offset = to - start;
  } else {
    offset = from !== undefined ? from : 2 ** 32;
  }
  return start + Math.floor(rand() * (offset + 1));
};

export const randomBytes = (size: number, rand: () => number = Math.random) => {
  const hexArr = [...Array(size)].map(() => randomInt(0, 255, rand));
  return Buffer.from(new Uint16Array(hexArr));
};

export const makeRand = (seed: string, size = 4) => {
  const randseeds = Array.from({ length: size }, () => 0);
  for (let i = 0; i < seed.length; i += 1) {
    randseeds[i % size] = (randseeds[i % size] << 5) - randseeds[i % size] + seed.charCodeAt(i);
  }

  return () => {
    const [firstSeed] = randseeds.splice(0, 1);
    const t = firstSeed ^ (firstSeed << 11);

    const lastSeed = randseeds[size - 1];
    const newSeed = lastSeed ^ (lastSeed >> 19) ^ t ^ (t >> 8);
    randseeds.push(newSeed);

    return (newSeed >>> 0) / ((1 << 31) >>> 0);
  };
};
