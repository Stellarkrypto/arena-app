import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, Megaphone, Waves, Swords, Target, Users2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import MatchCard from "../components/MatchCard";
import { bg1, border, purple, purpleDeep, pink, textPrimary, textSecondary, textMuted, MODES } from "../theme";

const MODE_ICON = { br: Waves, clash: Swords, lonewolf: Target, cs1v1: Users2 };
const MODE_GRAD = {
  br: ["#2f80c9", "#1a5a94"], clash: ["#c9432f", "#8a2a1c"],
  lonewolf: ["#c99a2f", "#8a6a1c"], cs1v1: ["#7B61FF", "#4a3aa8"],
};

function ModeThumb({ mode, size = "large" }) {
  const Icon = MODE_ICON[mode] || Waves;
  const grad = MODE_GRAD[mode] || MODE_GRAD.br;
  const h = size === "large" ? 90 : 60;
  return (
    <div style={{ height: h, borderRadius: 10, background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={size === "large" ? 30 : 22} color="#ffffffcc" />
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: "50px 0", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: bg1, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Calendar size={24} color={textMuted} />
      </div>
      <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>{text}</p>
    </div>
  );
}

function BannerCarousel({ banners }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (banners.length === 0) return null;
  const b = banners[i % banners.length];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${purple}, ${pink})`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Megaphone size={14} color="#ffffffcc" />
          <span style={{ fontSize: 10, color: "#ffffffcc", textTransform: "uppercase", letterSpacing: "0.06em" }}>Announcement</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{b.title}</p>
        {b.subtitle && <p style={{ fontSize: 12, color: "#ffffffdd", margin: "4px 0 0" }}>{b.subtitle}</p>}
        {b.cta_text && (
          <button onClick={() => b.link && window.open(b.link, "_blank")} style={{ marginTop: 12, background: "#fff", color: purpleDeep, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {b.cta_text}
          </button>
        )}
      </div>
      {banners.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
          {banners.map((_, idx) => <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: idx === i % banners.length ? purple : border }} />)}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({});
  const [myMatchIds, setMyMatchIds] = useState(new Set());
  const [mode, setMode] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const load = useCallback(async () => {
    const { data: b } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
    setBanners(b || []);
    const { data: m } = await supabase.from("matches_public").select("*").order("start_time", { ascending: true });
    setMatches(m || []);
    const { data: mp } = await supabase.from("match_players").select("match_id, user_id");
    const c = {};
    const mine = new Set();
    (mp || []).forEach((row) => {
      c[row.match_id] = (c[row.match_id] || 0) + 1;
      if (row.user_id === session?.user?.id) mine.add(row.match_id);
    });
    setCounts(c);
    setMyMatchIds(mine);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const join = async (m) => {
    const { error } = await supabase.rpc("join_match", { p_match_id: m.id });
    if (error) return showToast(error.message.replace(/^.*: /, ""));
    showToast("Registered!");
    load();
    refresh();
  };

  if (mode) {
    const list = matches.filter((m) => m.mode === mode);
    return (
      <div>
        {toast && <Toast msg={toast} />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setMode(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><ChevronLeft size={20} color={textPrimary} /></button>
          <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0 }}>{MODES.find((x) => x.key === mode)?.label}</p>
        </div>
        {list.length === 0 && <EmptyState text="No matches found." />}
        {list.map((m) => (
          <MatchCard key={m.id} m={m} joined={myMatchIds.has(m.id)} playerCount={counts[m.id] || 0} showJoin onJoin={join} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast msg={toast} />}
      <BannerCarousel banners={banners} />
      <p style={{ fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 12px" }}>Free Fire</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {MODES.map((m) => {
          const count = matches.filter((x) => x.mode === m.key).length;
          return (
            <button key={m.key} onClick={() => setMode(m.key)} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 14, padding: 10, cursor: "pointer", textAlign: "left" }}>
              <ModeThumb mode={m.key} />
              <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: "8px 0 0" }}>{m.label}</p>
              <p style={{ fontSize: 11, color: textSecondary, margin: "2px 0 0" }}>{count} matches found</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, marginBottom: 10, padding: "10px 14px", background: "#1a1f3d", border: `0.5px solid ${purple}55`, color: textPrimary, fontSize: 13, borderRadius: 10, textAlign: "center" }}>
      {msg}
    </div>
  );
}
