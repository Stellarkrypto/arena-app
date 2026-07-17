import React from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { bg0, bg1, border, textPrimary, textSecondary, textMuted, amber, green, purple, purpleDeep, money, tagFor } from "../theme";

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: bg0, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
      <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color || textPrimary, margin: "3px 0 0" }}>{value}</p>
    </div>
  );
}

export default function MatchCard({ m, joined, playerCount, showJoin, onJoin }) {
  const navigate = useNavigate();
  const isPast = m.start_time && new Date(m.start_time).getTime() < Date.now();

  return (
    <div
      onClick={() => navigate(`/match/${m.id}`)}
      style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
        <span style={{ fontSize: 10, color: textMuted, background: bg0, padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>{tagFor(m.id)}</span>
      </div>
      <p style={{ fontSize: 11, color: amber, margin: "3px 0 0" }}>{m.start_time ? new Date(m.start_time).toLocaleString() : "time not set"}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        <StatBox label="Win prize" value={money(m.win_prize)} color={green} />
        <StatBox label="Per kill" value={money(m.per_kill)} color={amber} />
        <StatBox label="Entry fee" value={money(m.entry_fee)} color={purple} />
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {[m.squad, m.map, m.perspective].filter(Boolean).map((tg) => (
          <span key={tg} style={{ fontSize: 10, color: textSecondary, background: bg0, padding: "3px 8px", borderRadius: 6 }}>{tg}</span>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 11, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
          <Users size={12} />{playerCount}/{m.max_players}
        </span>
        {showJoin ? (
          joined ? (
            <span style={{ fontSize: 11, padding: "5px 12px", background: `${green}22`, color: green, borderRadius: 20, fontWeight: 500 }}>registered</span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin && onJoin(m); }}
              style={{ background: `linear-gradient(135deg, ${purple}, ${purpleDeep})`, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Join
            </button>
          )
        ) : (
          <span style={{ fontSize: 12, color: purple, fontWeight: 600 }}>{isPast ? "View result ›" : "Registered ›"}</span>
        )}
      </div>
    </div>
  );
}
