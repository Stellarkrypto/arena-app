import React, { useEffect, useState, useCallback } from "react";
import { BarChart3, Waves, Swords, Target, Users2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import MatchCard from "../components/MatchCard";
import { bg1, textPrimary, textSecondary, textMuted, bg0, MODES } from "../theme";

const MODE_ICON = { br: Waves, clash: Swords, lonewolf: Target, cs1v1: Users2 };

export default function Result() {
  const { session } = useAuth();
  const [resultMode, setResultMode] = useState("br");
  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({});
  const [myMatchIds, setMyMatchIds] = useState(new Set());

  const load = useCallback(async () => {
    const { data: m } = await supabase.from("matches").select("*").eq("mode", resultMode).order("start_time", { ascending: false });
    setMatches(m || []);
    const ids = (m || []).map((x) => x.id);
    if (ids.length) {
      const { data: mp } = await supabase.from("match_players").select("match_id, user_id").in("match_id", ids);
      const c = {}; const mine = new Set();
      (mp || []).forEach((r) => { c[r.match_id] = (c[r.match_id] || 0) + 1; if (r.user_id === session?.user?.id) mine.add(r.match_id); });
      setCounts(c); setMyMatchIds(mine);
    } else { setCounts({}); setMyMatchIds(new Set()); }
  }, [resultMode, session]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: "0 0 14px" }}>Result</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {MODES.map((m) => {
          const Icon = MODE_ICON[m.key];
          return (
            <button key={m.key} onClick={() => setResultMode(m.key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: resultMode === m.key ? textPrimary : bg1, color: resultMode === m.key ? bg0 : textSecondary,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <Icon size={13} />{m.label}
            </button>
          );
        })}
      </div>
      {matches.length === 0 ? (
        <div style={{ padding: "50px 0", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: bg1, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><BarChart3 size={24} color={textMuted} /></div>
          <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>No matches found.</p>
        </div>
      ) : (
        matches.map((m) => <MatchCard key={m.id} m={m} joined={myMatchIds.has(m.id)} playerCount={counts[m.id] || 0} showJoin={m.start_time && new Date(m.start_time).getTime() >= Date.now()} />)
      )}
    </div>
  );
}
