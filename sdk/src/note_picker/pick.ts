import { SortedNotes } from './sorted_notes';

const findPair = (sortedNotes: SortedNotes, value: bigint) => {
  let i = 0;
  const left = sortedNotes.nth(i);
  if (!left) {
    return null;
  }

  let sum = left.value;
  let j = sortedNotes.length - 1;
  if (i === j) {
    return sum >= value ? [left] : null;
  }

  const right = sortedNotes.nth(j);
  sum += right.value;
  let tmpSum = sum;
  let pair = [left, right];
  while (i < j - 1) {
    if (tmpSum > value) {
      j--;
    } else if (tmpSum < value) {
      i++;
    } else if (i < j - 2) {
      i++;
      j--;
    } else {
      break;
    }

    const tmpPair = [sortedNotes.nth(i), sortedNotes.nth(j)];
    tmpSum = tmpPair[0].value + tmpPair[1].value;
    if (tmpSum === value || (sum !== value && tmpSum > value)) {
      sum = tmpSum;
      pair = tmpPair;
    }
  }

  return sum >= value ? pair : null;
};

export const pick = (sortedNotes: SortedNotes, value: bigint) => {
  const settledNotes = sortedNotes.filter(n => !n.allowChain);
  const pendingNotes = sortedNotes.filter(n => n.allowChain);
  const pairs = [findPair(settledNotes, value)];
  pendingNotes.forEach(note => {
    const notes = settledNotes.clone().add(note);
    pairs.push(findPair(notes, value));
  });

  return (
    pairs.reduce((pair, tmpPair) => {
      if (!pair || !tmpPair) {
        return pair || tmpPair;
      }

      if (pair.length !== tmpPair.length) {
        return pair.length > tmpPair.length ? pair : tmpPair;
      }

      const sum = pair.reduce((s, n) => s + n.value, BigInt(0));
      const tmpSum = tmpPair.reduce((s, n) => s + n.value, BigInt(0));
      if (tmpSum < sum || (tmpSum === sum && tmpPair[0].value > pair[0].value)) {
        return tmpPair;
      }
      return pair;
    }, pairs[0]) || null
  );
};
