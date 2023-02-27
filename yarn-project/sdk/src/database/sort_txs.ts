// Input txs should have been sorted by `settled` in descending order before passing in to this function.
// Return a sorted txs array based on settled time. Sort based on created time if settled times are the same.
export function sortTxs<
  T extends {
    created: Date;
    settled?: Date | number;
  },
>(txs: T[]): T[] {
  return [
    ...txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1)),
    ...txs.filter(tx => tx.settled).sort((a, b) => (a.settled !== b.settled ? 0 : a.created < b.created ? 1 : -1)),
  ];
}
