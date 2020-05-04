export async function asyncForEach<T>(arr: T[], callback: (t: T, n: number, f: T[]) => void) {
  for (let i = 0; i < arr.length; i += 1) {
    await callback(arr[i], i, arr);
  }
}
