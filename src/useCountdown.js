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

// Room ID/password visibility is now enforced by the database itself
// (see matches_public view): the browser only ever receives a non-null
// room_id/room_pass if the current user has joined AND the admin has set
// it. So on the client, "unlockable" just means "is it actually present."
export function roomIsUnlockable(match) {
  return Boolean(match?.room_id);
}

// Registration closes 3 minutes before the match's automatic start time.
// The server enforces this too (join_match RPC) — this is just for the UI.
export function registrationClosed(match) {
  if (!match?.start_time) return false;
  return Date.now() >= new Date(match.start_time).getTime() - 3 * 60 * 1000;
}
