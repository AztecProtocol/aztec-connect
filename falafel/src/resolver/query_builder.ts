import { Repository } from 'typeorm';

export const MAX_COUNT = 100;

export type Sort = 'ASC' | 'DESC';

export type Where = { [key: string]: any };

type FieldType = 'Int' | 'Date' | 'Buffer' | 'String';

export interface Field {
  field: string;
  type: FieldType;
}

interface Condition {
  cond: string;
  parameters?: { [key: string]: any };
}

interface QueryArgs {
  where?: Where;
  order?: { [key: string]: any };
  take?: number;
  skip?: number;
}

const transformValueTypeMapping: { [key in FieldType]: (value: any) => any } = {
  Buffer: (value: string) => (value ? Buffer.from(value.replace(/^0x/i, ''), 'hex') : value),
  Date: (value: Date) => (value ? value.toISOString().replace(/T/, ' ').slice(0, -1) : value),
  Int: (value: string) => value,
  String: (value: string) => value,
};

const getFieldConditions = ({ field, type }: Field, where: Where) => {
  const conditions: Condition[] = [];

  const fieldValue = (suffix = '') => {
    const value = where[`${field}${suffix}`];
    if (value === undefined) return;

    const transformValue = transformValueTypeMapping[type];
    if (Array.isArray(value)) {
      return value.map(transformValue);
    }

    return transformValue(value);
  };

  const eq = fieldValue();
  if (eq !== undefined) {
    if (!eq && type === 'Buffer') {
      conditions.push({ cond: `obj.${field} IS NULL` });
    } else {
      conditions.push({ cond: `obj.${field} = :${field}`, parameters: { [field]: eq } });
    }
  }

  const not = fieldValue('_not');
  if (not !== undefined) {
    if (!not && type === 'Buffer') {
      conditions.push({ cond: `obj.${field} IS NOT NULL` });
    } else {
      conditions.push({ cond: `obj.${field} != :${field}_not`, parameters: { [`${field}_not`]: not } });
    }
  }

  const isNull = fieldValue('_null');
  if (isNull) {
    conditions.push({ cond: `obj.${field} IS NULL` });
  }

  const isNotNull = fieldValue('_not_null');
  if (isNotNull) {
    conditions.push({ cond: `obj.${field} IS NOT NULL` });
  }

  const _gte = fieldValue('_gte');
  const _gt = fieldValue('_gt');
  const [gte, gt] = _gte > _gt || _gt === undefined ? [_gte] : [, _gt];
  if (gte !== undefined) {
    conditions.push({ cond: `obj.${field} >= :${field}_gte`, parameters: { [`${field}_gte`]: gte } });
  } else if (gt !== undefined) {
    conditions.push({ cond: `obj.${field} > :${field}_gt`, parameters: { [`${field}_gt`]: gt } });
  }

  const _lte = fieldValue('_lte');
  const _lt = fieldValue('_lt');
  const [lte, lt] = _lte < _lt || _lt === undefined ? [_lte] : [, _lt];
  if (lte !== undefined) {
    conditions.push({ cond: `obj.${field} <= :${field}_lte`, parameters: { [`${field}_lte`]: lte } });
  } else if (lt !== undefined) {
    conditions.push({ cond: `obj.${field} < :${field}_lt`, parameters: { [`${field}_lt`]: lt } });
  }

  const includes = fieldValue('_in');
  if (includes && includes.length) {
    conditions.push({ cond: `obj.${field} IN (:...${field}_in)`, parameters: { [`${field}_in`]: includes } });
  }

  const excludes = fieldValue('_not_in');
  if (excludes && excludes.length) {
    conditions.push({
      cond: `obj.${field} NOT IN (:...${field}_not_in)`,
      parameters: { [`${field}_not_in`]: excludes },
    });
  }

  return conditions;
};

export const getQuery = <T>(rep: Repository<T>, fields: Field[], { where, order, take, skip }: QueryArgs) => {
  const query = rep.createQueryBuilder('obj').select('obj');
  if (where) {
    const conds = fields.map(field => getFieldConditions(field, where)).flat();
    conds.forEach(({ cond, parameters }) => query.andWhere(cond, parameters));
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
