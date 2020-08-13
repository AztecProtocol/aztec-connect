import React from 'react';
import { Constructor } from './constructor';
import { parseTypeDefinition } from './parse_type_definition';
import { SpecTable, SpecType } from './spec_table';
import { Type } from './type';
import { Tag } from './tag';

interface TypeDefinitionProps extends React.HTMLAttributes<HTMLHeadingElement> {
  srcName: string;
  typeName: string;
}

export const TypeDefinition: React.FunctionComponent<TypeDefinitionProps> = ({ srcName, typeName }) => {
  let types: Type[] = [];
  try {
    const [packageName, ...filePath] = srcName.split('/');
    // Need to specify module name and file extension in require() or it will import all the files in node_modules.
    let inputBuffer = '';
    switch (packageName) {
      case 'aztec2-sdk':
        inputBuffer = require(`!!raw-loader!../../../node_modules/aztec2-sdk/${filePath.join('/').slice(0, -5)}.d.ts`)
          .default;
        break;
      case 'barretenberg':
        inputBuffer = require(`!!raw-loader!../../../node_modules/barretenberg/${filePath.join('/').slice(0, -5)}.d.ts`)
          .default;
        break;
      default:
    }
    types = parseTypeDefinition(inputBuffer, typeName);
  } catch (e) {
    console.error(e);
    return null;
  }

  if (!types.length) {
    return null;
  }

  const constructorType = types.find(t => t.name === 'constructor');

  const staticVars = types
    .filter(t => t.isStatic && !t.isPrivate && t.type !== 'function')
    .map(({ name, type }) => ({
      name,
      type,
      description: '',
    }));

  const staticMethods = types
    .filter(t => t.isStatic && !t.isPrivate && t.type === 'function')
    .map(({ name, params, returns }) => ({
      name,
      type: returns!,
      params,
      description: '',
    }));

  const vars = types
    .filter(t => !t.isStatic && !t.isPrivate && t.type !== 'function')
    .map(({ name, type }) => ({
      name,
      type,
      description: '',
    }));

  const methods = types
    .filter(t => !t.isStatic && !t.isPrivate && t.type === 'function' && t !== constructorType)
    .map(({ name, params, returns }) => ({
      name,
      type: returns!,
      params,
      description: '',
    }));

  return (
    <>
      {!constructorType && <Tag text="interface" />}
      {constructorType && <Constructor name={typeName} params={constructorType.params!} />}
      {staticVars.length > 0 && <SpecTable type={SpecType.STATIC_VAR} rows={staticVars} />}
      {staticMethods.length > 0 && <SpecTable type={SpecType.STATIC_METHOD} rows={staticMethods} />}
      {vars.length > 0 && <SpecTable type={SpecType.VARIABLE} rows={vars} />}
      {methods.length > 0 && <SpecTable type={SpecType.METHOD} rows={methods} />}
    </>
  );
};
