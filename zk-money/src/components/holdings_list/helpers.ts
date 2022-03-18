export const HOLDINGS_PER_PAGE = 5;

export function slicePage<T>(items: T[], page: number) {
  return items.slice((page - 1) * HOLDINGS_PER_PAGE, page * HOLDINGS_PER_PAGE);
}
