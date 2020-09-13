import { Repository } from 'typeorm';

export const MAX_COUNT = 100;

export type Sort = 'ASC' | 'DESC';

interface QueryArgs {
  where?: { [key: string]: any };
  order?: { [key: string]: any };
  take?: number;
  skip?: number;
}

const getConstraint = (key: string) => {
  const [field, cond] = key.split(/_(.+)/);

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
  }

  return `obj.${field} = :${key}`;
};

export const getQuery = <T>(rep: Repository<T>, { where, order, take, skip }: QueryArgs) => {
  const query = rep.createQueryBuilder('obj').select('obj');
  if (where) {
    Object.keys(where).forEach(key => {
      const value = where[key];
      if (value !== undefined && value !== null) {
        query.andWhere(getConstraint(key), { [key]: value });
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
