import { Repository } from 'typeorm';

export const MAX_COUNT = 100;

export type Sort = 'ASC' | 'DESC';

interface QueryArgs {
  where?: { [key: string]: any };
  order?: { [key: string]: any };
  take?: number;
  skip?: number;
}

const getConstraint = (key: string, field: string, cond: string) => {
  switch (cond) {
    case 'not':
      return `obj.${field} != :${key}`;
    case 'null':
      return `obj.${field} IS NULL`;
    case 'not_null':
      return `obj.${field} IS NOT NULL`;
    case 'gte':
      return `obj.${field} >= :${key}`;
    case 'gt':
      return `obj.${field} > :${key}`;
    case 'lte':
      return `obj.${field} <= :${key}`;
    case 'lt':
      return `obj.${field} < :${key}`;
    case 'in':
      return `obj.${field} IN (:...${key})`;
    case 'not_in':
      return `obj.${field} NOT IN (:...${key})`;
    case 'starts_with':
    case 'ends_with':
    case 'contains':
      return `hex(obj.${field}) LIKE :${key}`;
  }

  return `obj.${field} = :${key}`;
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

export const getQuery = <T>(rep: Repository<T>, { where, order, take, skip }: QueryArgs) => {
  const query = rep.createQueryBuilder('obj').select('obj');
  if (where) {
    Object.keys(where).forEach(key => {
      const [field, cond] = key.split(/_(.+)/);
      const value = where[key];
      if (value !== undefined && value !== null) {
        query.andWhere(getConstraint(key, field, cond), { [key]: getConstraintValue(cond, value) });
      }
    });
  }
  if (order) {
    Object.keys(order).forEach((field, i) => {
      if (!i) {
        query.orderBy(`obj.${field}`, order[field]);
      } else {
        query.addOrderBy(`obj.${field}`, order[field]);
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
