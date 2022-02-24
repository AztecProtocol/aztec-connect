import { useEffect, useState } from 'react';
import { IObs } from './types';

export function useObs<T>(obs: IObs<T>) {
  const [value, setValue] = useState(obs.value);
  useEffect(() => {
    setValue(obs.value);
    return obs.listen(setValue);
  }, [obs]);
  return value;
}

export function useMaybeObs<T>(obs?: IObs<T>) {
  const [value, setValue] = useState(obs?.value);
  useEffect(() => {
    setValue(obs?.value);
    return obs?.listen(setValue);
  }, [obs]);
  return value;
}
