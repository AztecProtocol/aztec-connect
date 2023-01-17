import { useState, useCallback, useEffect } from 'react';
import { formatError, shouldErrorBeShownAtTopLevel } from './error_utils.js';

export interface GlobalErrorItem {
  key: string;
  message: string;
  errorDetails: string;
  count: number;
}

export function useGlobalErrorItems() {
  const [items, setItems] = useState<GlobalErrorItem[]>([]);

  const dismissItem = useCallback((key: string) => {
    setItems(prevItems => prevItems.filter(item => item.key !== key));
  }, []);

  useEffect(() => {
    const addItem = (message: string, errorDetails: string) => {
      const key = `error::${message}__${errorDetails}`;
      // Seems error events can fire mid-render, hence a timeout is used to
      // prevent circular state updates.
      setTimeout(() => {
        setItems(prevItems => {
          const alreadyExists = prevItems.some(x => x.key === key);
          if (alreadyExists) {
            return prevItems.map(item => (item.key === key ? { ...item, count: item.count + 1 } : item));
          } else {
            return [...prevItems, { key, message, errorDetails, count: 1 }];
          }
        });
      }, 0);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (!shouldErrorBeShownAtTopLevel(event.reason)) return;
      const errorDetail = formatError(event.reason);
      if (!errorDetail) return;
      const message = formatError(event.reason, true) ?? 'Unknown';
      addItem(message, errorDetail);
    };

    const handleError = (event: ErrorEvent) => {
      const errorDetail = JSON.stringify(
        {
          colno: event.colno,
          error: event.error,
          filename: event.filename,
          lineno: event.lineno,
          message: event.message,
        },
        null,
        2,
      );
      addItem(event.message, errorDetail);
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return { globalErrorItems: items, dismissGlobalErrorItem: dismissItem };
}
