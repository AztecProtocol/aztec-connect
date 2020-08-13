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

const getRowKey = (row: { name: string }) => row.name;

const paramColumns = [
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

export const returnColumns = [
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
  {
    caption: 'Description',
    render: ({ description }: Spec) => <Description description={description} />,
  },
];

export const staticVariableColumns = [
  {
    caption: 'Static Variable',
    render: ({ name }: Spec) => <Name>{name}</Name>,
  },
  {
    caption: 'Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
];

export const staticMethodColumns = [
  {
    caption: 'Static Method',
    render: ({ name, params }: Spec) => <TypeRenderer type={{ type: 'function', name, params }} />,
  },
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
];

export const variableColumns = [
  {
    caption: 'Variable',
    render: ({ name }: Spec) => <Name>{name}</Name>,
  },
  {
    caption: 'Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
  },
];

export const methodColumns = [
  {
    caption: 'Method',
    render: ({ name, params }: Spec) => <TypeRenderer type={{ type: 'function', name, params }} />,
  },
  {
    caption: 'Return Type',
    render: ({ type }: Spec) => <TypeRenderer type={type} />,
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

const specColumnsMapping: { [key in SpecType]: any } = {
  PARAM: paramColumns,
  RETURN: returnColumns,
  STATIC_VAR: staticVariableColumns,
  STATIC_METHOD: staticMethodColumns,
  VARIABLE: variableColumns,
  METHOD: methodColumns,
};

interface SpecTableProps extends React.HTMLAttributes<HTMLHeadingElement> {
  type: SpecType;
  rows: Spec[];
}

export const SpecTable: React.FunctionComponent<SpecTableProps> = ({ type, rows }) => {
  const columns = specColumnsMapping[type];
  return <Table columns={columns} rows={rows} getRowKey={getRowKey} />;
};
