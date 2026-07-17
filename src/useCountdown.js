import { useEffect, useState } from "react";

export function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { started: true, h: 0, m: 0, s: 0 };
  return {
    started: false,
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

// Whether room details should be visible right now for a given match.
// Uses the admin's explicit room_reveal_time if set, otherwise falls back
// to the default "15 minutes before start" rule.
export function roomIsUnlockable(match) {
  const now = Date.now();
  if (match.room_reveal_time) return now >= new Date(match.room_reveal_time).getTime();
  if (!match.start_time) return false;
  return now >= new Date(match.start_time).getTime() - 15 * 60 * 1000;
}
