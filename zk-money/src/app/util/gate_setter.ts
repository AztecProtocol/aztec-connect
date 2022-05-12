import type { Dispatch, SetStateAction } from 'react';

// This function is useful when setting state within an async useEffect call.
// Often only the most current effect should be able to update state, so it is
// convenient to first wrap the setter such that it can be invalidated during
// effect cleanup.
export function gateSetter<T>(setter: Dispatch<SetStateAction<T>>) {
  let open = true;
  return {
    set: (action: SetStateAction<T>) => {
      if (open) setter(action);
    },
    close: () => {
      open = false;
    },
  };
}
