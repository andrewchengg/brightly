// src/components/MockExam/Timer.tsx
// This component can be used if you prefer a dedicated timer display, 
// but for Phase 1, the timer logic is integrated into MockExamComponent.
// If you decide to use this, pass timeRemaining and setTimeRemaining (or similar) from MockExamComponent.

'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  initialTime: number; // Duration in seconds
  onExpire: () => void;
  isRunning: boolean;
  onTick?: (timeLeft: number) => void; 
}

export default function Timer({ initialTime, onExpire, isRunning, onTick }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime); 
  }, [initialTime]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && isRunning) { 
        onExpire();
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        const newTimeLeft = prev - 1;
        if (onTick) onTick(newTimeLeft);
        if (newTimeLeft <= 0) {
          clearInterval(timerId);
        }
        return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isRunning, onExpire, onTick]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 0 || remainingSeconds < 0) return "00:00"; 
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-xl font-mono font-semibold">
      {formatTime(timeLeft)}
    </div>
  );
}
