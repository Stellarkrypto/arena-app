import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Swords, Target, Users2, Waves, Clock } from "lucide-react";
import { bg0, bg1, border, textPrimary, textSecondary, textMuted, amber, green, purple, purpleDeep, red, money, tagFor, cardShadow } from "../theme";
import { useCountdown } from "../useCountdown";

const MODE_ICON = { br: Waves, clash: Swords, lonewolf: Target, cs1v1: Users2 };
const MODE_GRAD = {
  br: ["#2f80c9", "#1a5a94"], clash: ["#c9432f", "#8a2a1c"],
  lonewolf: ["#c99a2f", "#8a6a1c"], cs1v1: ["#7B61FF", "#4a3aa8"],
};

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: bg0, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
      <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color || textPrimary, margin: "3px 0 0" }}>{value}</p>
    </div>
  );
}

function StatusBar({ target }) {
  const cd = useCountdown(target);
  if (!cd) return null;
  return (
    <div style={{
      marginTop: 10, borderRadius: 10, padding: "10px 0", textAlign: "center",
      background: cd.started ? `linear-gradient(90deg, ${red}, #a83a34)` : `linear-gradient(90deg, ${green}, #22a37d)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {cd.started ? (
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "pulseDot 1.2s infinite" }} />
        ) : (
          <Clock size={13} color="#fff" />
        )}
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
          {cd.started ? "STARTED" : "STARTS IN"}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
          {String(cd.h).padStart(2, "0")}h : {String(cd.m).padStart(2, "0")}m : {String(cd.s).padStart(2, "0")}s
        </span>
      </div>
      <style>{`@keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}

export default function MatchCard({ m, joined, playerCount, showJoin, onJoin }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const fillPct = Math.min(100, Math.round((playerCount / m.max_players) * 100));
  const full = playerCount >= m.max_players;
  const Icon = MODE_ICON[m.mode] || Waves;
  const grad = MODE_GRAD[m.mode] || MODE_GRAD.br;

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (submitting || joined) return;
    setSubmitting(true);
    try {
      await onJoin(m);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/match/${m.id}`)}
      style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12, cursor: "pointer", boxShadow: cardShadow }}
    >
      <div style={{ position: "relative", height: 110, background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={36} color="#ffffffaa" />
        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, background: purple, color: "#fff", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>{tagFor(m.id)}</span>
      </div>

      <div style={{ padding: 14 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0 }}>{m.name}</p>
        <p style={{ fontSize: 12, color: amber, margin: "4px 0 0" }}>{m.start_time ? new Date(m.start_time).toLocaleString() : "time not set"}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          <StatBox label="Win prize" value={money(m.win_prize)} color={green} />
          <StatBox label="Per kill" value={money(m.per_kill)} color={amber} />
          <StatBox label="Entry fee" value={money(m.entry_fee)} color={purple} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {[m.squad, m.map, m.perspective].filter(Boolean).map((tg) => (
            <span key={tg} style={{ fontSize: 11, color: textSecondary, fontWeight: 600 }}>{tg}</span>
          ))}
        </div>

        {showJoin && !joined && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 5, background: bg0, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fillPct}%`, background: fillPct >= 90 ? red : purple, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={12} />{full ? "Full" : `Only ${m.max_players - playerCount} spots left`} · {playerCount}/{m.max_players}
              </span>
              <button
                onClick={handleJoin}
                disabled={submitting || full}
                style={{
                  background: full ? bg0 : green, color: full ? textMuted : bg0, border: full ? `0.5px solid ${border}` : "none",
                  borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
                  cursor: submitting || full ? "default" : "pointer", opacity: submitting ? 0.6 : 1,
                  boxShadow: full ? "none" : `0 0 14px ${green}66`,
                }}
              >
                {submitting ? "JOINING…" : full ? "FULL" : "JOIN NOW"}
              </button>
            </div>
          </div>
        )}
        {joined && (
          <div style={{ marginTop: 12, textAlign: "center", background: `${green}18`, border: `0.5px solid ${green}55`, borderRadius: 8, padding: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: green }}>✓ Registered</span>
          </div>
        )}

        <StatusBar target={m.start_time} />
      </div>
    </div>
  );
}
