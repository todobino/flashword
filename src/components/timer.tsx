
'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  isPaused: boolean;
}

export function Timer({ isPaused }: TimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!isPaused) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (isPaused && seconds !== 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, seconds]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="text-2xl font-mono font-bold bg-muted text-muted-foreground rounded-md h-10 w-28 flex items-center justify-center">
      {formatTime(seconds)}
    </div>
  );
}
