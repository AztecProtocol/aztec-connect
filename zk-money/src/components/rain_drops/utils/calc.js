/*
------------------------------------------
| rand:float - returns random float
|
| min:number - minimum value
| max:number - maximum value
| ease:function - easing function to apply to the random value
|
| Get a random float between two values,
| with the option of easing bias.
------------------------------------------ */
export function rand(min, max, ease) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  let random = Math.random();
  if (ease) {
    random = ease(Math.random(), 0, 1, 1);
  }
  return random * (max - min) + min;
}

/*
------------------------------------------
| randInt:integer - returns random integer
|
| min:number - minimum value
| max:number - maximum value
|
| Get a random integer between two values,
| with the option of easing bias.
------------------------------------------ */
export function randInt(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*
------------------------------------------
| clamp:number - returns clamped value
|
| val:number - value to be clamped
| min:number - minimum of clamped range
| max:number - maximum of clamped range
|
| Clamp a value to a min/max range.
------------------------------------------ */
export function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

export function rangeMap(val, base, mapTo) {
  const ratio = Math.max(0, val - base.min) / (base.max - base.min);
  return mapTo.min + (mapTo.max - mapTo.min) * ratio;
}
