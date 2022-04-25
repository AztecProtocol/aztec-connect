export function listenPoll(fn: () => void, interval: number) {
  fn();
  const task = setInterval(fn, interval);
  return () => clearInterval(task);
}
