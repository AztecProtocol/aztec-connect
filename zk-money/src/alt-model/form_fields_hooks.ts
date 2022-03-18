import { mapObj } from 'app/util/objects';
import { useState } from 'react';

export type TouchedFormFields<TFields> = {
  [K in keyof TFields]: boolean;
};

type FieldsSetter<TFields> = (values: TFields) => void;
type FieldSetters<TFields> = {
  [K in keyof TFields]: (value: TFields[K]) => void;
};

export function useTrackedFieldChangeHandlers<TFields>(
  fields: TFields,
  fieldsSetter: FieldsSetter<TFields>,
): [TouchedFormFields<TFields>, FieldSetters<TFields>] {
  const [touchedFields, setTouchedFields] = useState(() => mapObj(fields, () => false));
  const fieldSetters = mapObj(fields, (_, name) => (value: typeof _) => {
    if (!touchedFields[name]) setTouchedFields({ ...touchedFields, [name]: true });
    fieldsSetter({ ...fields, [name]: value });
  });
  return [touchedFields, fieldSetters];
}
