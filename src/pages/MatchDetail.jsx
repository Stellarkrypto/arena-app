import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Trophy, Users, Target } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { useCountdown, roomIsUnlockable } from "../useCountdown";
import { bg0, bg1, bg2, border, purple, green, amber, red, textPrimary, textSecondary, textMuted, money, tagFor } from "../theme";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, refresh } = useAuth();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState([]);
  const [showRoom, setShowRoom] = useState(false);
  const [showPrize, setShowPrize] = useState(false);
  const [toast, setToast] = useState("");
  const cd = useCountdown(match?.start_time);

  const load = useCallback(async () => {
    const { data: m } = await supabase.from("matches_public").select("*").eq("id", id).single();
    setMatch(m);
    const { data: mp } = await supabase.from("match_players").select("user_id, profiles(name)").eq("match_id", id);
    setPlayers(mp || []);
    if (m?.completed) {
      const { data: r } = await supabase.from("match_results").select("*, profiles(name)").eq("match_id", id).order("prize", { ascending: false });
      setResults(r || []);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const join = async () => {
    const { error } = await supabase.rpc("join_match", { p_match_id: id });
    if (error) return showToast(error.message.replace(/^.*: /, ""));
    showToast("Registered!");
    load();
    refresh();
  };

  if (!match) {
    return (
      <div>
        <BackBtn navigate={navigate} />
        <p style={{ fontSize: 13, color: textMuted, marginTop: 20 }}>Loading…</p>
      </div>
    );
  }

  const joined = players.some((p) => p.user_id === session?.user?.id);
  const spotsLeft = match.max_players - players.length;
  const fillPct = Math.min(100, Math.round((players.length / match.max_players) * 100));
  const roomUnlockable = roomIsUnlockable(match);

  return (
    <div>
      {toast && <div style={{ marginBottom: 10, padding: "10px 14px", background: bg2, border: `0.5px solid ${purple}55`, color: textPrimary, fontSize: 13, borderRadius: 10, textAlign: "center" }}>{toast}</div>}
      <BackBtn navigate={navigate} />

      <div style={{ background: `linear-gradient(160deg, ${bg2}, ${bg1})`, border: `0.5px solid ${border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <span style={{ fontSize: 11, background: purple, color: "#fff", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>{tagFor(match.id)}</span>
        <p style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: "8px 0 0" }}>{match.name}</p>
        <p style={{ fontSize: 12, color: amber, margin: "4px 0 0" }}>{match.start_time ? new Date(match.start_time).toLocaleString() : "time not set"}</p>

        {cd && (
          <div style={{ marginTop: 14, background: cd.started ? `${green}22` : bg0, border: `0.5px solid ${cd.started ? green : border}`, borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cd.started ? green : purple }} />
            {cd.started ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: green }}>Match has started</span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>
                STARTS IN {String(cd.h).padStart(2, "0")}h : {String(cd.m).padStart(2, "0")}m : {String(cd.s).padStart(2, "0")}s
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <StatBox label="Win prize" value={money(match.win_prize)} color={green} />
        <StatBox label="Per kill" value={money(match.per_kill)} color={amber} />
        <StatBox label="Entry fee" value={money(match.entry_fee)} color={purple} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[match.squad, match.map, match.perspective].filter(Boolean).map((tg) => (
          <span key={tg} style={{ fontSize: 11, color: textSecondary, background: bg1, border: `0.5px solid ${border}`, padding: "4px 10px", borderRadius: 8 }}>{tg}</span>
        ))}
      </div>

      {!joined ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 6, background: bg1, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${fillPct}%`, background: `linear-gradient(90deg, ${amber}, ${red})`, borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: textSecondary }}>{spotsLeft > 0 ? `Only ${spotsLeft} spots left` : "Full"} · {players.length}/{match.max_players}</span>
            <button onClick={join} disabled={spotsLeft <= 0} style={{ background: spotsLeft > 0 ? green : textMuted, color: bg0, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: spotsLeft > 0 ? "pointer" : "not-allowed" }}>
              JOIN NOW
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, textAlign: "center", background: `${green}18`, border: `0.5px solid ${green}55`, borderRadius: 10, padding: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: green }}>You're registered for this match</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowRoom((s) => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: bg1, border: `0.5px solid ${border}`, borderRadius: 10, padding: "10px 0", color: purple, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Lock size={13} />Room Details
        </button>
        <button onClick={() => setShowPrize((s) => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: bg1, border: `0.5px solid ${border}`, borderRadius: 10, padding: "10px 0", color: purple, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Trophy size={13} />Prize Pool
        </button>
      </div>

      {showRoom && (
        <div style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          {!joined ? (
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Join this match to see room details here.</p>
          ) : roomUnlockable ? (
            <div>
              <p style={{ fontSize: 12, color: textSecondary, margin: 0 }}>Room ID: <span style={{ color: textPrimary, fontWeight: 600 }}>{match.room_id || "not set yet"}</span></p>
              <p style={{ fontSize: 12, color: textSecondary, margin: "6px 0 0" }}>Password: <span style={{ color: textPrimary, fontWeight: 600 }}>{match.room_pass || "not set yet"}</span></p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: textMuted, margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Lock size={12} />Unlocks 15 minutes before start.</p>
          )}
        </div>
      )}
      {showPrize && (
        <div style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: textSecondary, margin: 0 }}>Winner takes <span style={{ color: green, fontWeight: 700 }}>{money(match.win_prize)}</span></p>
          <p style={{ fontSize: 12, color: textSecondary, margin: "6px 0 0" }}>Plus <span style={{ color: amber, fontWeight: 700 }}>{money(match.per_kill)}</span> per confirmed kill for every player</p>
        </div>
      )}

      {match.completed && results.length > 0 && (
        <div style={{ background: bg1, border: `0.5px solid ${green}55`, borderRadius: 14, padding: 16, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${green}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Trophy size={16} color={green} /></div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>Final Results</p>
              <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>Prizes have been credited to wallets</p>
            </div>
          </div>
          {results.map((r) => (
            <div key={r.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: `0.5px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.winner && <Trophy size={13} color={amber} />}
                <span style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>{r.profiles?.name || "Player"}</span>
                <span style={{ fontSize: 11, color: textMuted, display: "flex", alignItems: "center", gap: 3 }}><Target size={11} />{r.kills}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.prize > 0 ? green : textMuted }}>{r.prize > 0 ? money(r.prize) : "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: players.length ? 12 : 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${purple}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={16} color={purple} /></div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>Registered Players</p>
            <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>{players.length} players joined</p>
          </div>
        </div>
        {players.map((p, idx) => (
          <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: idx === 0 ? "none" : `0.5px solid ${border}` }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: bg0, color: textMuted, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
            <span style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>{p.profiles?.name || "Player"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackBtn({ navigate }) {
  return (
    <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, color: textPrimary, fontSize: 13, fontWeight: 600 }}>
      <ChevronLeft size={20} />Back
    </button>
  );
}
function StatBox({ label, value, color }) {
  return (
    <div style={{ background: bg0, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
      <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color || textPrimary, margin: "3px 0 0" }}>{value}</p>
    </div>
  );
}
