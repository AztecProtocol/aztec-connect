import React from 'react';
import { Constructor } from './constructor';
import { parseTypeDefinition } from './parse_type_definition';
import { SpecTable, SpecType } from './spec_table';
import { Type } from './type';
import { fetchTypeDeclaration } from './fetch_type_declaration';
import { parseCommentContent } from './parse_comment';

type TypeDefinitionOptions = 'AS_INTERFACE';

interface TypeDefinitionProps extends React.HTMLAttributes<HTMLHeadingElement> {
  srcName: string;
  typeName: string;
  decorator?: string;
  options?: TypeDefinitionOptions[];
}

export const TypeDefinition: React.FunctionComponent<TypeDefinitionProps> = ({
  srcName,
  typeName,
  decorator,
  options = [],
}) => {
  let types: Type[] = [];
  let inputBuffer = '';
  try {
    inputBuffer = fetchTypeDeclaration(srcName);
    types = parseTypeDefinition(inputBuffer, typeName, decorator);
  } catch (e) {
    console.error(e);
    return null;
  }

  if (!types.length) {
    return null;
  }

  const hasOption = (option: TypeDefinitionOptions) => options.indexOf(option) >= 0;

  const constructorType = types.find(t => t.name === 'constructor');

  const staticVars = types
    .filter(t => t.isStatic && !t.isPrivate && t.type !== 'function')
    .map(({ name, type }) => ({
      name,
      type,
      description: parseCommentContent(inputBuffer, name),
    }));

  const staticMethods = types
    .filter(t => t.isStatic && !t.isPrivate && t.type === 'function')
    .map(({ name, params, returns }) => ({
      name,
      type: returns!,
      params,
      description: parseCommentContent(inputBuffer, name),
    }));

  const vars = types
    .filter(t => !t.isStatic && !t.isPrivate && t.type !== 'function')
    .map(({ name, type }) => ({
      name,
      type,
      description: parseCommentContent(inputBuffer, name),
    }));

  const methods = types
    .filter(t => !t.isStatic && !t.isPrivate && t.type === 'function' && t !== constructorType)
    .map(({ name, params, returns }) => ({
      name,
      type: returns!,
      params,
      description: parseCommentContent(inputBuffer, name),
    }));

  return (
    <>
      {constructorType && !hasOption('AS_INTERFACE') && (
        <Constructor name={typeName} params={constructorType.params!} />
      )}
      {vars.length > 0 && <SpecTable type={SpecType.VARIABLE} rows={vars} />}
      {methods.length > 0 && <SpecTable type={SpecType.METHOD} rows={methods} />}
      {staticVars.length > 0 && <SpecTable type={SpecType.STATIC_VAR} rows={staticVars} />}
      {staticMethods.length > 0 && <SpecTable type={SpecType.STATIC_METHOD} rows={staticMethods} />}
    </>
  );
};
