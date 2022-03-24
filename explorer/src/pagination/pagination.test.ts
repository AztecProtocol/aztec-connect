import { getVisiblePageNumbers } from './';

describe('Pagination', () => {
  it('return an array of page numbers that will be rendered on page', () => {
    expect(getVisiblePageNumbers(5, 1, 1)).toEqual([1]);
    expect(getVisiblePageNumbers(5, 2, 1)).toEqual([2]);
    expect(getVisiblePageNumbers(5, 5, 1)).toEqual([5]);

    expect(getVisiblePageNumbers(5, 1, 2)).toEqual([1, 2]);
    expect(getVisiblePageNumbers(5, 2, 2)).toEqual([2, 3]);
    expect(getVisiblePageNumbers(5, 3, 2)).toEqual([3, 4]);
    expect(getVisiblePageNumbers(5, 4, 2)).toEqual([4, 5]);
    expect(getVisiblePageNumbers(5, 5, 2)).toEqual([4, 5]);

    expect(getVisiblePageNumbers(5, 1, 3)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(5, 2, 3)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(5, 3, 3)).toEqual([2, 3, 4]);
    expect(getVisiblePageNumbers(5, 4, 3)).toEqual([3, 4, 5]);
    expect(getVisiblePageNumbers(5, 5, 3)).toEqual([3, 4, 5]);

    expect(getVisiblePageNumbers(5, 1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisiblePageNumbers(5, 2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisiblePageNumbers(5, 5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('return numbers of the pages on each end', () => {
    expect(getVisiblePageNumbers(8, 1, 2, 2)).toEqual([1, 2, 7, 8]);
    expect(getVisiblePageNumbers(8, 2, 2, 2)).toEqual([1, 2, 3, 7, 8]);
    expect(getVisiblePageNumbers(8, 3, 2, 2)).toEqual([1, 2, 3, 4, 7, 8]);
    expect(getVisiblePageNumbers(8, 4, 2, 2)).toEqual([1, 2, 4, 5, 7, 8]);
    expect(getVisiblePageNumbers(8, 5, 2, 2)).toEqual([1, 2, 5, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 6, 2, 2)).toEqual([1, 2, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 7, 2, 2)).toEqual([1, 2, 7, 8]);
    expect(getVisiblePageNumbers(8, 8, 2, 2)).toEqual([1, 2, 7, 8]);

    expect(getVisiblePageNumbers(8, 1, 3, 2)).toEqual([1, 2, 3, 7, 8]);
    expect(getVisiblePageNumbers(8, 2, 3, 2)).toEqual([1, 2, 3, 7, 8]);
    expect(getVisiblePageNumbers(8, 3, 3, 2)).toEqual([1, 2, 3, 4, 7, 8]);
    expect(getVisiblePageNumbers(8, 4, 3, 2)).toEqual([1, 2, 3, 4, 5, 7, 8]);
    expect(getVisiblePageNumbers(8, 5, 3, 2)).toEqual([1, 2, 4, 5, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 6, 3, 2)).toEqual([1, 2, 5, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 7, 3, 2)).toEqual([1, 2, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 8, 3, 2)).toEqual([1, 2, 6, 7, 8]);
  });

  it('return all page numbers if visible pages are more than total pages', () => {
    expect(getVisiblePageNumbers(1, 1, 5)).toEqual([1]);
    expect(getVisiblePageNumbers(2, 1, 5)).toEqual([1, 2]);

    expect(getVisiblePageNumbers(2, 1, 2, 1)).toEqual([1, 2]);
    expect(getVisiblePageNumbers(2, 1, 2, 3)).toEqual([1, 2]);
  });

  it('treat page as first or last page if it is out of bound', () => {
    expect(getVisiblePageNumbers(5, 0, 3)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(5, 6, 3)).toEqual([3, 4, 5]);
    expect(getVisiblePageNumbers(5, 10, 3)).toEqual([3, 4, 5]);

    expect(getVisiblePageNumbers(8, 0, 3, 2)).toEqual([1, 2, 3, 7, 8]);
    expect(getVisiblePageNumbers(8, 9, 3, 2)).toEqual([1, 2, 6, 7, 8]);
    expect(getVisiblePageNumbers(8, 10, 3, 2)).toEqual([1, 2, 6, 7, 8]);
  });
});
