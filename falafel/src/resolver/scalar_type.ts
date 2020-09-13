import { GraphQLScalarType, Kind } from 'graphql';
import { rollupStatus } from '../entity/rollup';

export const ISODateTime = new GraphQLScalarType({
  name: 'ISODateTime',
  description: 'The javascript `Date` as ISO string.',
  parseValue(value: string) {
    return new Date(value);
  },
  serialize(value: Date) {
    if (!(value instanceof Date)) {
      throw new Error(`Unable to serialize value '${value}' as it's not instance of 'Date'`);
    }
    return value.toISOString();
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      // The date format stored in SQLite is 'YYYY-MM-DD HH:mm:ss.sss' instead of 'YYYY-MM-DDTHH:mm:ss.sssZ'.
      return new Date(ast.value).toISOString().replace(/T/, ' ').slice(0, -1);
    }
    return null;
  },
});

export const HexString = new GraphQLScalarType({
  name: 'HexString',
  description: 'The Node.js raw `Buffer` as hex string.',
  parseValue(value: Buffer) {
    return value.toString('hex');
  },
  serialize(value: string) {
    if (!value.match(/^(0x)?[0-9a-f]+$/i)) {
      throw new Error(`Unable to serialize value '${value}' as it's not a valid hex string.`);
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      if (!ast.value.match(/^(0x)?[0-9a-f]+$/i)) {
        throw new Error(`Unable to parse value '${ast.value}' as it's not a valid hex string.`);
      }
      return Buffer.from(ast.value.replace(/^0x/i, ''), 'hex');
    }
    return null;
  },
});

export const RollupStatusScalarType = new GraphQLScalarType({
  name: 'RollupStatus',
  description: `One of [${rollupStatus.map(status => `\`${status}\``).join(', ')}].`,
  parseValue(value: string) {
    return value;
  },
  serialize(value: string) {
    if (rollupStatus.indexOf(value as any) < 0) {
      throw new Error(`'${value}' is not a valid rollup status.`);
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      if (rollupStatus.indexOf(ast.value as any) < 0) {
        throw new Error(
          `'${ast.value}' is not a valid rollup status. Should be one of [${rollupStatus
            .map(status => `'${status}'`)
            .join(', ')}].`,
        );
      }
      return ast.value;
    }
    return null;
  },
});
