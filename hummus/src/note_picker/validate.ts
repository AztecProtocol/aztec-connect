import { SortedNotes } from './sorted_notes';
import { noteSum } from './tracked_note';

export function validate(sortedNotes: SortedNotes, value: number, numberOfNotes: number): boolean {
  if (sortedNotes.length < numberOfNotes) {
    return false;
  }

  const maxSet = sortedNotes.last(numberOfNotes);
  const maxSum = noteSum(maxSet);
  return value <= maxSum;
}
