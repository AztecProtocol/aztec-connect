import { randomInts } from '../utils/random';
import SortedNotes from './sorted_notes';
import { TrackedNote, noteSum } from './note';

export const getStartIndex = (
  sortedNotes: SortedNotes,
  value: number,
  numberOfNotes: number,
) => {
  const suffixSum = numberOfNotes <= 1
    ? 0
    : sortedNotes.last(numberOfNotes - 1).reduce((accum, note) => accum + note.note.value, 0);
  const ceil = (sortedNotes.length - numberOfNotes) + 1;
  let start = 0;
  while (start < ceil) {
    if (suffixSum + sortedNotes.nth(start).note.value >= value) {
      return start;
    }

    do {
      start += 1;
    } while (sortedNotes.nth(start) && sortedNotes.nth(start).note.value === sortedNotes.nth(start - 1).note.value);
  }

  return -1;
};

export const pick = (
  sortedNotes: SortedNotes,
  value: number,
  numberOfNotes: number,
) => {
  let notes: TrackedNote[] = [];

  if (numberOfNotes <= 0) {
    return notes;
  }

  const totalNotes = sortedNotes.length;
  let start = getStartIndex(sortedNotes, value, numberOfNotes);
  if (start < 0) {
    return;
  }

  while (start <= totalNotes - numberOfNotes) {
    const indexes = randomInts(numberOfNotes, start, totalNotes - 1);

    notes = indexes.map((idx) => sortedNotes.nth(idx));
    if (noteSum(notes) >= value) {
      break;
    }
    // skip redundant identical values
    const minValue = notes[0].note.value;
    const minValueCount = notes.reduce((count, note) => count + ((note.note.value === minValue ? 1 : 0)), 0);
    const firstMinIndex = sortedNotes.indexOfValue(minValue, start);
    const lastMinIndex = sortedNotes.lastIndexOfValue(minValue);
    start = Math.max(
      firstMinIndex + 1,
      (lastMinIndex - (minValueCount - 1)) + 1,
    );
  }

  return notes;
};
