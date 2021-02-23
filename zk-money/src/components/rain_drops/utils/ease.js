/*
------------------------------------------
| inOutSine:float - returns eased float value
|
| t:number - current time
| b:number - beginning value
| c:number - change in value
| d:number - duration
|
| Get an eased float value based on inOutSine.
------------------------------------------ */
export function inOutSine(t, b, c, d) {
  return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
}

/*
------------------------------------------
| inExpo:float - returns eased float value
|
| t:number - current time
| b:number - beginning value
| c:number - change in value
| d:number - duration
|
| Get an eased float value based on inExpo.
------------------------------------------ */
export function inExpo(t, b, c, d) {
  return t === 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
}
