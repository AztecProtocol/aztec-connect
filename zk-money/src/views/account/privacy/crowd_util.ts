const MAX_PEOPLE = 600;
const QUAD_SEG_AREA = MAX_PEOPLE / Math.PI;
export const ELLIPSE_ASPECT = 1.8;
export const MAX_Y = Math.ceil(Math.sqrt(QUAD_SEG_AREA / ELLIPSE_ASPECT));
export const MAX_X = Math.ceil(Math.sqrt(QUAD_SEG_AREA * ELLIPSE_ASPECT));

class Vec2 {
  constructor(readonly x: number, readonly y: number) {}

  get mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  get normal() {
    if (this.mag === 0) return new Vec2(0, 0);
    return new Vec2(this.x / this.mag, this.y / this.mag);
  }

  add(vec: Vec2) {
    return new Vec2(this.x + vec.x, this.y + vec.y);
  }

  mult(factor: number) {
    return new Vec2(this.x * factor, this.y * factor);
  }
}

const MAX_X_SQ = MAX_X * MAX_X;
const MAX_Y_SQ = MAX_Y * MAX_Y;
const compactPoints: { vec: Vec2; rnd: number; ellipticMag: number; shuffleDir: Vec2 }[] = [];
for (let i = 1 - MAX_X; i < MAX_X; i++) {
  for (let y = 1 - MAX_Y; y < MAX_Y; y++) {
    const x = y % 2 === 0 ? i : i - 0.5;
    const xSq = x * x;
    const ySq = y * y;
    const ellipticMag = xSq / MAX_X_SQ + ySq / MAX_Y_SQ;
    const isInsideEllipse = xSq / MAX_X_SQ + ySq / MAX_Y_SQ <= 1;
    if (isInsideEllipse) {
      const rnd = Math.random();
      const vec = new Vec2(x, y);
      const shuffleDir = new Vec2(Math.sin(rnd * 2 * Math.PI), Math.cos(rnd * 2 * Math.PI));
      compactPoints.push({ vec, rnd, ellipticMag, shuffleDir });
    }
  }
}
compactPoints.sort((p1, p2) => {
  const diff = p1.ellipticMag - p2.ellipticMag;
  if (diff) return diff;
  return p1.rnd - p2.rnd;
});

export const MAX_SIZE = compactPoints.length;

export const calcScene = (size: number) => {
  const people: { pos: Vec2; opacity: number }[] = [];
  const completeness = size / MAX_SIZE;
  const crowdSmallness = 1 - completeness;
  const crowdSmallnessSq = crowdSmallness * crowdSmallness;
  for (let idx = 0; idx < compactPoints.length; idx++) {
    const { vec, rnd, shuffleDir } = compactPoints[idx];
    const exitedness = Math.max(0, Math.min(1, idx - size + 1));
    const exitVec = vec.normal.mult(exitedness);
    const opacity = (1 - exitedness) * (1 - 0.5 * rnd);
    const outsideness = idx / MAX_SIZE;
    const shuffleVec = shuffleDir.mult(0.5 * rnd);
    const spreadVec = vec.normal.mult(Math.max(0, 1 * rnd * (2 * crowdSmallnessSq + (outsideness + 2) * outsideness)));
    const pos = vec.add(exitVec).add(shuffleVec).add(spreadVec);
    people.push({ pos, opacity });
  }
  const zoom = (MAX_Y * 1.5) / Math.sqrt(size + 100);
  return { people, zoom };
};
