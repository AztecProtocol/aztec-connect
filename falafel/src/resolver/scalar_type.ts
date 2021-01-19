import { GraphQLScalarType, Kind } from 'graphql';

// The date format stored in SQLite is 'YYYY-MM-DD HH:mm:ss.sss' instead of 'YYYY-MM-DDTHH:mm:ss.sssZ'.
export const toSQLIteDateTime = (value: string | Date) => new Date(value).toISOString().replace(/T/, ' ').slice(0, -1);

export const ISODateTime = new GraphQLScalarType({
  name: 'ISODateTime',
  description: 'The javascript `Date` as ISO string.',
  serialize(value: Date) {
    if (!(value instanceof Date)) {
      throw new Error(`Unable to serialize value '${value}' as it's not instance of 'Date'`);
    }
    return value.toISOString();
  },
  parseValue(value: string | Date) {
    return toSQLIteDateTime(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      return null;
    }

    return toSQLIteDateTime(ast.value);
  },
});

const isHexString = (value: string) => value.match(/^(0x)?[0-9a-f]+$/i);

export const HexString = new GraphQLScalarType({
  name: 'HexString',
  description: 'The Node.js raw `Buffer` as hex string.',
  serialize(value: Buffer) {
    if (!(value instanceof Buffer)) {
      throw new Error(`Unable to serialize value '${value}' as it's not instance of 'Buffer'`);
    }
    return value.toString('hex');
  },
  parseValue(value: string | Buffer) {
    if (value instanceof Buffer) {
      return value;
    }

    if (typeof value !== 'string' || !isHexString(value)) {
      throw new Error(`Unable to parse value '${value}' as it's not a valid hex string.`);
    }

    return Buffer.from(value.replace(/^0x/i, ''), 'hex');
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      return null;
    }

    if (!isHexString(ast.value)) {
      throw new Error(`Unable to parse value '${ast.value}' as it's not a valid hex string.`);
    }

    return Buffer.from(ast.value.replace(/^0x/i, ''), 'hex');
  },
});
