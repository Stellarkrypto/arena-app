import React, { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, Lock } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import MatchCard from "../components/MatchCard";
import { bg0, bg1, bg2, border, purple, textPrimary, textSecondary, textMuted } from "../theme";

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ padding: "50px 0", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: bg1, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon size={24} color={textMuted} />
      </div>
      <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function MyMatches() {
  const { session } = useAuth();
  const [sub, setSub] = useState("upcoming");
  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    if (!session) return;
    const { data: mp } = await supabase.from("match_players").select("match_id").eq("user_id", session.user.id);
    const ids = (mp || []).map((r) => r.match_id);
    if (ids.length === 0) { setMatches([]); return; }
    const { data: m } = await supabase.from("matches").select("*").in("id", ids);
    setMatches(m || []);
    const { data: allMp } = await supabase.from("match_players").select("match_id").in("match_id", ids);
    const c = {};
    (allMp || []).forEach((r) => { c[r.match_id] = (c[r.match_id] || 0) + 1; });
    setCounts(c);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const filtered = matches.filter((m) => (sub === "upcoming" ? !m.start_time || new Date(m.start_time).getTime() >= now : m.start_time && new Date(m.start_time).getTime() < now));

  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: "0 0 14px" }}>My matches</p>
      <div style={{ display: "flex", background: bg1, borderRadius: 12, padding: 3, marginBottom: 16 }}>
        {["upcoming", "past"].map((s) => (
          <button key={s} onClick={() => setSub(s)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: sub === s ? bg2 : "transparent", color: sub === s ? textPrimary : textMuted }}>
            {s === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={sub === "upcoming" ? Calendar : Clock} text={`No ${sub} matches found.`} />
      ) : (
        filtered.map((m) => {
          const showRoom = m.start_time && now >= new Date(m.start_time).getTime() - 15 * 60 * 1000 && now < new Date(m.start_time).getTime() + 3 * 3600000;
          return (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <MatchCard m={m} joined playerCount={counts[m.id] || 0} showJoin={false} />
              {sub === "upcoming" && (
                showRoom ? (
                  <div style={{ marginTop: -4, background: bg0, borderRadius: 10, padding: 10, fontSize: 12, border: `0.5px solid ${border}` }}>
                    <p style={{ margin: 0, color: textSecondary }}>Room ID: <span style={{ color: textPrimary }}>{m.room_id || "not set yet"}</span></p>
                    <p style={{ margin: 0, marginTop: 3, color: textSecondary }}>Password: <span style={{ color: textPrimary }}>{m.room_pass || "not set yet"}</span></p>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: textMuted, marginTop: -2, display: "flex", alignItems: "center", gap: 4 }}><Lock size={11} /> unlocks 15 min before start</p>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
