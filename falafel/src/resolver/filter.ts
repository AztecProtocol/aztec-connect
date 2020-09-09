import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

export const MAX_COUNT = 100;

export type Sort = 'ASC' | 'DESC';

export interface Filter {
  field: string;
  filter: any;
}

export type Where = { [key: string]: any };

export const toFindConditions = (filters: Filter[]) =>
  filters.reduce(
    (accum, { field, filter }) => ({
      ...accum,
      [field]: filter,
    }),
    {} as any,
  );

const buildRangeFilter = (gte?: number | Date, lte?: number | Date) => {
  if (gte !== undefined && lte !== undefined) {
    return Between(gte, lte);
  }

  if (gte !== undefined) {
    return MoreThanOrEqual(gte);
  }

  if (lte !== undefined) {
    return LessThanOrEqual(lte);
  }
};

export const buildIntFieldFilter = (field: string, where: Where) => {
  const value = where[field];
  if (value !== undefined) {
    return value;
  }

  const gt = where[`${field}_gt`];
  const gte = where[`${field}_gte`];
  const lt = where[`${field}_lt`];
  const lte = where[`${field}_lte`];
  const gteValue = gt !== undefined ? gt + 1 : gte;
  const lteValue = lt !== undefined ? lt - 1 : lte;
  return buildRangeFilter(gteValue, lteValue);
};

export const buildDateFieldFilter = (field: string, where: Where) => {
  const value = where[field];
  if (value !== undefined) {
    return value;
  }

  const gt = where[`${field}_gt`];
  const gte = where[`${field}_gte`];
  const lt = where[`${field}_lt`];
  const lte = where[`${field}_lte`];
  const gteValue = gt !== undefined ? new Date(gt.getTime() + 1) : gte ? new Date(gte) : gte;
  const lteValue = lt !== undefined ? new Date(lt.getTime() - 1) : lte ? new Date(lte) : lte;
  return buildRangeFilter(gteValue, lteValue);
};

export interface FilterDef {
  field: string;
  type: 'Int' | 'Date' | 'Buffer' | 'String';
}

export const buildFilters = (defs: FilterDef[], where: Where) => {
  return defs
    .map(({ field, type }) => {
      switch (type) {
        case 'Int': {
          const filter = buildIntFieldFilter(field, where);
          return filter
            ? {
                field,
                filter,
              }
            : undefined;
        }
        case 'Date': {
          const filter = buildDateFieldFilter(field, where);
          return filter
            ? {
                field,
                filter,
              }
            : undefined;
        }
        case 'Buffer': {
          const value = where[field];
          return value
            ? {
                field,
                filter: Buffer.from(value, 'hex'),
              }
            : undefined;
        }
        case 'String': {
          const filter: string = where[field];
          return filter !== undefined ? { field, filter } : undefined;
        }
      }
    })
    .filter(f => f && f.filter !== undefined) as Filter[];
};
