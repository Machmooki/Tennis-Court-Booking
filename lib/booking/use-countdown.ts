import { useEffect, useState } from "react";

function secondsUntil(deadlineMs: number): number {
  return Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
}

/**
 * Ticks down the seconds remaining until a fixed `deadlineMs` timestamp,
 * recomputing from the wall clock every second. Deriving the remaining time
 * from an absolute deadline (rather than a fresh "start at N seconds" timer)
 * means the countdown stays correct across page reloads/remounts - e.g. a
 * guest who reloads the payment page 10 minutes after booking still sees
 * ~5 minutes left, not a reset 15:00.
 */
export function useCountdownTo(deadlineMs: number): number {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(deadlineMs));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSecondsLeft(secondsUntil(deadlineMs));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deadlineMs]);

  return secondsLeft;
}
