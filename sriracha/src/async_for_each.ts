export default async function asyncForEach(arr: any, callback: (data: any) => void) {
  try {
    for (let i = 0; i < arr.length; i += 1) {
      await callback(arr[i].toString()); // eslint-disable-line no-await-in-loop
    }
  } catch (err) {
    console.log(err);
  }
}
