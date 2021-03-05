import React, { useEffect, useState } from 'react';
import { WorldState } from '../app';

const decryptTime = 300; // ms

const calculateProgress = (worldState: WorldState, batchDecryptElapsed: number, overtimeElapsed: number) => {
  const { latestRollup, accountSyncedToRollup } = worldState;
  if (latestRollup <= 0) {
    return 0;
  }

  const batchSize = latestRollup - accountSyncedToRollup;
  return Math.round((batchSize ? batchDecryptElapsed / batchSize : 1) * 95 + (overtimeElapsed / latestRollup) * 5);
};

interface ProgressHandlerProps {
  worldState: WorldState;
  children(progress: number): JSX.Element;
}

export const ProgressHandler: React.FunctionComponent<ProgressHandlerProps> = ({ worldState, children }) => {
  const [batchDecryptElapsed, setBatchDecryptElapsed] = useState(0);
  const [overtimeElapsed, setOvertimeElapsed] = useState(0);

  useEffect(() => {
    const { latestRollup, accountSyncedToRollup } = worldState;
    const batchSize = latestRollup - accountSyncedToRollup;
    if (!batchSize) {
      if (overtimeElapsed < latestRollup) {
        setOvertimeElapsed(latestRollup);
      }
      return;
    }

    let timer: number;
    if (batchDecryptElapsed >= batchSize) {
      const maxProgress = Math.floor(latestRollup * 0.8);
      if (overtimeElapsed < maxProgress) {
        timer = window.setTimeout(() => {
          setOvertimeElapsed(Math.min(maxProgress, overtimeElapsed + 5));
        }, 500);
      }
      return;
    }

    const increment = 1 + Math.round(Math.random() * 2);
    timer = window.setTimeout(() => {
      setBatchDecryptElapsed(Math.min(batchDecryptElapsed + increment, batchSize));
    }, increment * decryptTime);

    return () => {
      clearTimeout(timer);
    };
  }, [batchDecryptElapsed, overtimeElapsed, worldState]);

  const progress = calculateProgress(worldState, batchDecryptElapsed, overtimeElapsed);

  return children(progress);
};
