import { useEffect, useState } from 'react';
import { createGatedSetter } from '../gated_setter.js';
import { IObs } from './types.js';

export function useObs<T>(obs: IObs<T>) {
  const [value, setValue] = useState(obs.value);
  useEffect(() => {
    const gatedSetter = createGatedSetter(setValue);
    gatedSetter.set(obs.value);
    const unlisten = obs.listen(gatedSetter.set);
    return () => {
      gatedSetter.close();
      unlisten();
    };
  }, [obs]);
  return value;
}

export function useMaybeObs<T>(obs?: IObs<T>) {
  const [value, setValue] = useState(obs?.value);
  useEffect(() => {
    const gatedSetter = createGatedSetter(setValue);
    gatedSetter.set(obs?.value);
    const unlisten = obs?.listen(gatedSetter.set);
    return () => {
      gatedSetter.close();
      unlisten?.();
    };
  }, [obs]);
  return value;
}
