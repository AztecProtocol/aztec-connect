import React, { Children, Key, useReducer, cloneElement, useEffect } from 'react';

type KeyedNode = React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactPortal;

interface Item {
  key: Key;
  phase: 'mounting' | 'appearing' | 'static' | 'disappearing';
  until?: number;
  node: KeyedNode;
}

interface TransitionGroupState {
  items: Item[];
  nextChange?: number;
  lastChildren?: React.ReactNode;
  duration: number;
}

type TransitionGroupAction = { type: 'timer' } | { type: 'children'; children: React.ReactNode };

const getNextChange = (items: Item[]) =>
  items.reduce((acc, item) => {
    if (acc === undefined) return item.until;
    else if (item.until !== undefined) return Math.min(acc, item.until);
    else return acc;
  }, undefined as undefined | number);

const removeKey = (keys: Key[], key: Key) => {
  const idx = keys.indexOf(key);
  if (idx !== -1) keys.splice(idx, 1);
};

const reducer = (state: TransitionGroupState, action: TransitionGroupAction): TransitionGroupState => {
  switch (action.type) {
    case 'children': {
      if (action.children === state.lastChildren) return state;
      const nodes = Children.toArray(action.children);
      let changeDetected = false;
      const untouchedKeys = state.items.map(x => x.key);
      const nextItems = [...state.items];
      const now = Date.now();
      for (const node of nodes) {
        if (node && typeof node === 'object' && 'key' in node && node.key) {
          const { key } = node;
          const existingIdx = state.items.findIndex(x => x.key === key);
          if (existingIdx === -1) {
            nextItems.push({ key, phase: 'mounting', until: now + 30, node });
            changeDetected = true;
          } else {
            const existing = state.items[existingIdx];
            nextItems[existingIdx] = { ...existing, node };
            removeKey(untouchedKeys, key);
            changeDetected = true;
          }
        }
      }
      for (const key of untouchedKeys) {
        const itemIdx = state.items.findIndex(x => x.key === key);
        const item = state.items[itemIdx];
        nextItems[itemIdx] = { ...item, phase: 'disappearing', until: now + state.duration };
        changeDetected = true;
      }
      if (!changeDetected) return state;
      const nextChange = getNextChange(nextItems);
      return { ...state, items: nextItems, lastChildren: action.children, nextChange };
    }
    case 'timer': {
      const now = Date.now();
      const nextItems: Item[] = [];
      for (const item of state.items) {
        let nextItem: Item | null = item;
        if (item.until !== undefined && item.until <= now) {
          if (item.phase === 'mounting') {
            nextItem = {
              ...item,
              phase: 'appearing',
              until: now + state.duration,
            };
          } else if (item.phase === 'appearing') {
            nextItem = {
              ...item,
              phase: 'static',
              until: undefined,
            };
          } else if (item.phase === 'disappearing') {
            nextItem = null;
          }
        }
        if (nextItem) nextItems.push(nextItem);
      }
      const nextChange = getNextChange(nextItems);
      return { ...state, items: nextItems, nextChange };
    }
  }
};

const initialiser = ({ children, duration }: { children: React.ReactNode; duration: number }): TransitionGroupState => {
  const items: Item[] = [];
  const nodes = Children.toArray(children);
  for (const node of nodes) {
    if (node && typeof node === 'object' && 'key' in node && node.key) {
      items.push({ key: node.key, node, phase: 'static' });
    }
  }
  return { items, lastChildren: children, duration };
};

interface TransitionGroupProps {
  duration: number;
}

export const TransitionGroup: React.FunctionComponent<TransitionGroupProps> = ({ children, duration }) => {
  const [{ items, nextChange }, dispatch] = useReducer(reducer, { children, duration }, initialiser);
  useEffect(() => {
    dispatch({ type: 'children', children });
  }, [children]);
  useEffect(() => {
    if (nextChange !== undefined) {
      const task = setTimeout(() => dispatch({ type: 'timer' }), nextChange - Date.now());
      return () => clearTimeout(task);
    }
  }, [nextChange]);
  return (
    <>
      {items.map(item => {
        let className = item.phase;
        if ('className' in item.node) {
          const { className: existingClassName } = item.node;
          className += ' ' + existingClassName;
        }
        return cloneElement(item.node, { className });
      })}
    </>
  );
};
