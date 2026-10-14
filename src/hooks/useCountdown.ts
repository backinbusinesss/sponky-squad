import { useEffect, useMemo, useState } from "react";

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export function useCountdown(isoDate: string) {
  const target = useMemo(() => new Date(isoDate).getTime(), [isoDate]);
  const [remaining, setRemaining] = useState(() => Math.max(target - Date.now(), 0));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(Math.max(target - Date.now(), 0));
    }, SECOND);

    return () => window.clearInterval(interval);
  }, [target]);

  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    isElapsed: remaining <= 0,
  };
}
