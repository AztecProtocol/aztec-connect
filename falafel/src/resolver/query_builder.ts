import { Repository } from 'typeorm';

export const MAX_COUNT = 100;

export type Sort = 'ASC' | 'DESC';

export type FieldAliases = { [key: string]: string };

interface QueryArgs {
  where?: { [key: string]: any };
  order?: { [key: string]: any };
  take?: number;
  skip?: number;
}

const getConstraint = (key: string, field: string, cond: string) => {
  switch (cond) {
    case 'not':
      return `${field} != :${key}`;
    case 'null':
      return `${field} IS NULL`;
    case 'not_null':
      return `${field} IS NOT NULL`;
    case 'gte':
      return `${field} >= :${key}`;
    case 'gt':
      return `${field} > :${key}`;
    case 'lte':
      return `${field} <= :${key}`;
    case 'lt':
      return `${field} < :${key}`;
    case 'in':
      return `${field} IN (:...${key})`;
    case 'not_in':
      return `${field} NOT IN (:...${key})`;
    case 'starts_with':
    case 'ends_with':
    case 'contains':
      return `hex(${field}) LIKE :${key}`;
  }

  return `${field} = :${key}`;
};

const getConstraintValue = (cond: string, value: any) => {
  switch (cond) {
    case 'starts_with':
      return `${value.toString('hex')}%`;
    case 'ends_with':
      return `%${value.toString('hex')}`;
    case 'contains':
      return `%${value.toString('hex')}%`;
  }

  return value;
};

const fullFieldName = (field: string, aliases: FieldAliases) => {
  const fieldName = aliases[field] || field;
  return fieldName.indexOf('.') > 0 ? fieldName : `obj.${fieldName}`;
};

export const getQuery = <T>(
  rep: Repository<T>,
  { where, order, take, skip }: QueryArgs,
  fieldAliases: FieldAliases = {},
  leftJoins: string[] = [],
) => {
  const query = rep.createQueryBuilder('obj').select('obj');
  leftJoins.forEach(joinOn => {
    const [, table] = joinOn.split('.', 2);
    if (table) {
      query.leftJoinAndSelect(joinOn, table);
    } else {
      query.leftJoinAndSelect(`obj.${joinOn}`, joinOn);
    }
  });
  if (where) {
    Object.keys(where).forEach(key => {
      const [field, cond] = key.split(/_(.+)/);
      const fieldName = fullFieldName(field, fieldAliases);
      const value = where[key];
      if (value !== undefined && value !== null) {
        query.andWhere(getConstraint(key, fieldName, cond), { [key]: getConstraintValue(cond, value) });
      }
    });
  }
  if (order) {
    Object.keys(order).forEach((field, i) => {
      const fieldName = fullFieldName(field, fieldAliases);
      if (!i) {
        query.orderBy(fieldName, order[field]);
      } else {
        query.addOrderBy(fieldName, order[field]);
      }
    });
  }
  if (skip) {
    query.skip(skip);
  }
  if (take) {
    query.take(take);
  }
  return query;
};

export const pickOne = (filters: { [key: string]: any }) => {
  for (const filterName in filters) {
    return { [filterName]: filters[filterName] };
  }
  return {};
};
