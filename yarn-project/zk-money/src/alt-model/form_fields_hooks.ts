import { mapObj } from '../app/util/objects.js';
import { useRef, useState } from 'react';

export type TouchedFormFields<TFields> = {
  [K in keyof TFields]: boolean;
};

type FieldsSetter<TFields> = React.Dispatch<React.SetStateAction<TFields>>;
export type FieldSetters<TFields> = {
  [K in keyof TFields]: (value: TFields[K]) => void;
};

export function useTrackedFieldChangeHandlers<TFields>(
  fields: TFields,
  fieldsSetter: FieldsSetter<TFields>,
): [TouchedFormFields<TFields>, FieldSetters<TFields>] {
  const [touchedFields, setTouchedFields] = useState(() => mapObj(fields, () => false));
  // Initialising to a ref instead of memoising is safe on the assumptions that:
  //   - fieldsSetter is a stable react state hook rather than some arrow function with captures
  //   - The keys of `fields` all start with a defined value.
  // Using a ref is desirable becuase it stablises the setters for use in effect hooks
  const fieldSettersRef = useRef<FieldSetters<TFields>>();
  if (!fieldSettersRef.current) {
    fieldSettersRef.current = mapObj(fields, (_, name) => (value: typeof _) => {
      if (!touchedFields[name]) setTouchedFields({ ...touchedFields, [name]: true });
      fieldsSetter(latestFields => ({ ...latestFields, [name]: value }));
    });
  }
  return [touchedFields, fieldSettersRef.current];
}
