import { Between, MoreThanOrEqual, LessThanOrEqual, Not } from 'typeorm';

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

type FieldType = 'Int' | 'Date' | 'Buffer' | 'String';

export interface FilterDef {
  field: string;
  type: FieldType;
}

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

  const nValue = where[`${field}_not`];
  if (typeof nValue === 'number') {
    return Not(nValue);
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

  const nValue = where[`${field}_not`];
  if (typeof nValue === 'object') {
    return Not(nValue);
  }

  const gt = where[`${field}_gt`];
  const gte = where[`${field}_gte`];
  const lt = where[`${field}_lt`];
  const lte = where[`${field}_lte`];
  const gteValue = gt !== undefined ? new Date(gt.getTime() + 1) : gte;
  const lteValue = lt !== undefined ? new Date(lt.getTime() - 1) : lte;
  return buildRangeFilter(gteValue, lteValue);
};

export const buildBufferFieldFilter = (field: string, where: Where) => {
  const value = where[field];
  if (value) {
    return Buffer.from(value, 'hex');
  }

  const nValue = where[`${field}_not`];
  if (typeof nValue === 'string') {
    // Must use an empty string to find the rows with non-empty buffer value.
    return Not(nValue ? Buffer.from(nValue, 'hex') : '');
  }
};

export const buildStringFieldFilter = (field: string, where: Where) => {
  const value = where[field];
  if (value) {
    return value;
  }

  if (typeof where[`${field}_not`] === 'string') {
    return Not(where[`${field}_not`]);
  }
};

const fieldFilterMapping: { [key in FieldType]: (field: string, where: Where) => any } = {
  Int: buildIntFieldFilter,
  Date: buildDateFieldFilter,
  Buffer: buildBufferFieldFilter,
  String: buildStringFieldFilter,
};

export const buildFilters = (defs: FilterDef[], where: Where) => {
  return defs
    .map(({ field, type }) => {
      const filter = fieldFilterMapping[type](field, where);
      return filter
        ? {
            field,
            filter,
          }
        : undefined;
    })
    .filter(f => f && f.filter !== undefined) as Filter[];
};
