import React from 'react';
import Table from 'react-styleguidist/lib/client/rsg-components/Table';
import Name from 'react-styleguidist/lib/client/rsg-components/Name';
import TypeRenderer from 'react-styleguidist/lib/client/rsg-components/Type';
import Description from './description';
import { Type } from './type';

export interface Spec {
  name: string;
  type: string | Type;
  description: string;
  params?: Type[];
  optional?: boolean;
}

interface Column {
  caption: string;
  render: (spec: Spec) => JSX.Element;
  required?: (keyof Spec)[];
  optional?: boolean;
}

const getRowKey = (row: { name: string }) => row.name;

const paramColumns: Column[] = [
  {
    caption: 'Arguments',
    render: ({ name }: Spec) => <Name>{name}</Name>,
  },
  {
    caption: 'Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description, optional }: Spec) => (
      <Description description={optional ? `(optional) ${description}` : description} />
    ),
  },
];

export const returnColumns: Column[] = [
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
    optional: true,
    required: ['description'],
  },
];

export const staticVariableColumns: Column[] = [
  {
    caption: 'Static Variable',
    render: ({ name }: Spec) => <Name>{name}</Name>,
  },
  {
    caption: 'Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
    optional: true,
    required: ['description'],
  },
];

export const staticMethodColumns: Column[] = [
  {
    caption: 'Static Method',
    render: ({ name, params }: Spec) => <TypeRenderer type={{ type: 'function', name, params }} />,
  },
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
    optional: true,
    required: ['description'],
  },
];

export const variableColumns: Column[] = [
  {
    caption: 'Variable',
    render: ({ name }: Spec) => <Name>{name}</Name>,
  },
  {
    caption: 'Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
    optional: true,
    required: ['description'],
  },
];

export const methodColumns: Column[] = [
  {
    caption: 'Method',
    render: ({ name, params }: Spec) => <TypeRenderer type={{ type: 'function', name, params }} />,
  },
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
    optional: true,
    required: ['description'],
  },
];

export enum SpecType {
  PARAM = 'PARAM',
  RETURN = 'RETURN',
  STATIC_VAR = 'STATIC_VAR',
  STATIC_METHOD = 'STATIC_METHOD',
  VARIABLE = 'VARIABLE',
  METHOD = 'METHOD',
}

const specColumnsMapping: { [key in SpecType]: Column[] } = {
  PARAM: paramColumns,
  RETURN: returnColumns,
  STATIC_VAR: staticVariableColumns,
  STATIC_METHOD: staticMethodColumns,
  VARIABLE: variableColumns,
  METHOD: methodColumns,
};

const removeEmptyColumns = (columns: Column[], specs: Spec[]) =>
  columns.filter(
    ({ optional, required }) => !optional || (required && specs.some(spec => required.every(field => spec[field]))),
  );

interface SpecTableProps extends React.HTMLAttributes<HTMLHeadingElement> {
  type: SpecType;
  rows: Spec[];
}

export const SpecTable: React.FunctionComponent<SpecTableProps> = ({ type, rows }) => {
  const columns = removeEmptyColumns(specColumnsMapping[type], rows);
  return <Table columns={columns} rows={rows} getRowKey={getRowKey} />;
};
