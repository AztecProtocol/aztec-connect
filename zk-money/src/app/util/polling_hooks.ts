import { useEffect, useState } from 'react';
import { listenPoll } from './emitter_tools';
import { createGatedSetter } from './gated_setter';

export function usePolledCallback<T>(callback: (() => Promise<T>) | undefined, interval: number) {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    if (callback) {
      const gatedSetter = createGatedSetter(setValue);
      const unlisten = listenPoll(async () => {
        gatedSetter.set(await callback());
      }, interval);
      return () => {
        gatedSetter.close();
        unlisten();
      };
    }
  }, [callback, interval]);
  return value;
}
