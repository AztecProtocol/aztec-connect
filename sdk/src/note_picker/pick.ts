import { SortedNotes } from './sorted_notes';

export const pick = (sortedNotes: SortedNotes, value: number) => {
  let i = 0;
  const left = sortedNotes.nth(i);
  if (!left) {
    return null;
  }

  let sum = left.note.value;
  let j = sortedNotes.length - 1;
  if (i === j) {
    return sum >= value ? [left] : null;
  }

  const right = sortedNotes.nth(j);
  sum += right.note.value;
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

    const thisPair = [sortedNotes.nth(i), sortedNotes.nth(j)];
    tmpSum = thisPair[0].note.value + thisPair[1].note.value;
    if (tmpSum === value || (sum !== value && tmpSum > value)) {
      sum = tmpSum;
      pair = thisPair;
    }
  }

  return sum >= value ? pair : null;
};
