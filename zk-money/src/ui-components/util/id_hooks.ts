import { useRef } from 'react';

let lastId = 0;

export function useUniqueId() {
  return useRef(lastId++).current;
}
