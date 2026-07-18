import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Trophy, Wallet, ArrowDownToLine, CreditCard, Image as ImageIcon,
  ChevronLeft, Trash2, Plus, X, Check, Ban, Shield,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import {
  bg0, bg1, border, purple, purpleDeep, green, red, amber,
  textPrimary, textSecondary, textMuted, money, tagFor, MODES, inputStyle, btnPrimary, Field, SectionLabel,
} from "../theme";

export default function Admin() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState("matches");
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  if (profile === null) return <p style={{ padding: 20, fontSize: 13, color: textMuted }}>Loading…</p>;
  if (!profile?.is_admin) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", textAlign: "center", padding: 20 }}>
        <Shield size={32} color={textMuted} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 15, color: textPrimary, fontWeight: 600 }}>Admin access only</p>
        <p style={{ fontSize: 13, color: textMuted, marginTop: 8 }}>
          Your account isn't marked as an admin. Set <code>is_admin = true</code> on your profile row in Supabase to access this page.
        </p>
        <button onClick={() => navigate("/")} style={{ ...btnPrimary, marginTop: 16 }}>Back to app</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: bg0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `0.5px solid ${border}`, background: bg1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${purple}, ${purpleDeep})`, display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={14} color="#fff" /></div>
          <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Arena admin</span>
        </div>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 12 }}>Back to app</button>
      </div>

      {toast && <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: bg1, border: `0.5px solid ${purple}55`, color: textPrimary, fontSize: 13, borderRadius: 10, textAlign: "center" }}>{toast}</div>}

      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {[
          { id: "matches", label: "Matches", icon: LayoutDashboard },
          { id: "results", label: "Results", icon: Trophy },
          { id: "deposits", label: "Deposits", icon: Wallet },
          { id: "withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
          { id: "payment", label: "Payment", icon: CreditCard },
          { id: "banners", label: "Banners", icon: ImageIcon },
        ].map((p) => (
          <button key={p.id} onClick={() => setPage(p.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: page === p.id ? purple : bg1, color: page === p.id ? "#fff" : textSecondary, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
            <p.icon size={13} />{p.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {page === "matches" && <MatchesPage showToast={showToast} />}
        {page === "results" && <ResultsPage showToast={showToast} />}
        {page === "deposits" && <DepositsPage showToast={showToast} />}
        {page === "withdrawals" && <WithdrawalsPage showToast={showToast} />}
        {page === "payment" && <PaymentPage showToast={showToast} />}
        {page === "banners" && <BannersPage showToast={showToast} />}
      </div>
    </div>
  );
}

const FF_MAPS = ["Bermuda", "Purgatory", "Kalahari", "Alpine", "NEXTERRA"];
const DURATIONS = [
  { label: "10 minutes", value: 10 },
  { label: "20 minutes", value: 20 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
];

function MatchesPage({ showToast }) {
  const [subTab, setSubTab] = useState("create"); // "create" | "manage"
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState({ mode: "br", name: "", win_prize: 450, per_kill: 5, entry_fee: 10, max_players: 48, squad: "Squad", map: FF_MAPS[0], perspective: "TPP", duration: 30 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*, match_players(count)").order("created_at", { ascending: false });
    setMatches(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const createMatch = async () => {
    if (!form.name.trim()) return showToast("Give the match a name");
    const { duration, ...rest } = form;
    const start_time = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const { error } = await supabase.from("matches").insert({ ...rest, name: form.name.trim(), start_time });
    if (error) return showToast(error.message);
    setForm({ ...form, name: "" });
    showToast(`Match created — starts in ${duration} minutes`);
    setSubTab("manage");
    load();
  };
  const removeMatch = async (id) => { await supabase.from("matches").delete().eq("id", id); showToast("Match deleted"); load(); };

  return (
    <div>
      <div style={{ display: "flex", background: bg1, borderRadius: 12, padding: 3, marginBottom: 18 }}>
        {[{ id: "create", label: "Create" }, { id: "manage", label: `Manage (${matches.length})` }].map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: subTab === t.id ? purple : "transparent", color: subTab === t.id ? "#fff" : textSecondary,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "create" ? (
        <div>
          <Field label="Mode"><select style={inputStyle} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>{MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></Field>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Squad Time | Mobile | Regular" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="Win prize"><input style={inputStyle} type="number" value={form.win_prize} onChange={(e) => setForm({ ...form, win_prize: e.target.value })} /></Field>
            <Field label="Per kill"><input style={inputStyle} type="number" value={form.per_kill} onChange={(e) => setForm({ ...form, per_kill: e.target.value })} /></Field>
            <Field label="Entry fee"><input style={inputStyle} type="number" value={form.entry_fee} onChange={(e) => setForm({ ...form, entry_fee: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="Team size">
              <select style={inputStyle} value={form.squad} onChange={(e) => setForm({ ...form, squad: e.target.value })}>
                <option>Solo</option><option>Duo</option><option>Squad</option>
              </select>
            </Field>
            <Field label="Map">
              <select style={inputStyle} value={form.map} onChange={(e) => setForm({ ...form, map: e.target.value })}>
                {FF_MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="View"><input style={inputStyle} value={form.perspective} onChange={(e) => setForm({ ...form, perspective: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Max players"><input style={inputStyle} type="number" value={form.max_players} onChange={(e) => setForm({ ...form, max_players: e.target.value })} /></Field>
            <Field label="Starts in">
              <select style={inputStyle} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}>
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <p style={{ fontSize: 11, color: textMuted, margin: "-4px 0 14px" }}>Registration locks 3 minutes before start, whichever duration you pick.</p>
          <button onClick={createMatch} style={{ ...btnPrimary, width: "100%" }}>Create match</button>
        </div>
      ) : (
        <div>
          {matches.length === 0 && <p style={{ fontSize: 13, color: textMuted }}>No matches created yet.</p>}
          {matches.map((m) => <ManageMatchCard key={m.id} m={m} onDelete={() => removeMatch(m.id)} showToast={showToast} reload={load} />)}
        </div>
      )}
    </div>
  );
}

function ManageMatchCard({ m, onDelete, showToast, reload }) {
  const [roomId, setRoomId] = useState(m.room_id || "");
  const [roomPass, setRoomPass] = useState(m.room_pass || "");
  const [saving, setSaving] = useState(false);
  const dirty = roomId !== (m.room_id || "") || roomPass !== (m.room_pass || "");

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("matches").update({ room_id: roomId, room_pass: roomPass }).eq("id", m.id);
    setSaving(false);
    if (error) return showToast(error.message);
    showToast("Saved — visible to joined players instantly");
    reload();
  };

  return (
    <div style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
          <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>
            {tagFor(m.id)} · {MODES.find((x) => x.key === m.mode)?.label} · {m.squad} · {m.map} · {m.match_players?.[0]?.count || 0}/{m.max_players} joined
          </p>
          <p style={{ fontSize: 11, color: amber, margin: "3px 0 0" }}>
            starts {m.start_time ? new Date(m.start_time).toLocaleString() : "—"}
          </p>
        </div>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={16} color={red} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <input style={inputStyle} placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <input style={inputStyle} placeholder="Room password" value={roomPass} onChange={(e) => setRoomPass(e.target.value)} />
      </div>
      <button
        onClick={save}
        disabled={!dirty || saving}
        style={{ width: "100%", marginTop: 8, background: dirty ? green : bg0, color: dirty ? bg0 : textMuted, border: `0.5px solid ${dirty ? green : border}`, borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: dirty ? "pointer" : "default" }}
      >
        {saving ? "Saving…" : dirty ? "Save room details" : "Saved"}
      </button>
    </div>
  );
}

function ResultsPage({ showToast }) {
  const [matches, setMatches] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [openPlayers, setOpenPlayers] = useState([]);
  const [openResults, setOpenResults] = useState([]);
  const [draft, setDraft] = useState({});
  const [mode, setMode] = useState("enter"); // "enter" | "review"

  const load = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*").order("created_at", { ascending: false });
    setMatches(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openForEntry = async (m) => {
    const { data: mp } = await supabase.from("match_players").select("user_id, profiles(name, ff_uid)").eq("match_id", m.id);
    setOpenPlayers(mp || []);
    const init = {};
    (mp || []).forEach((p) => { init[p.user_id] = { kills: 0, winner: false }; });
    setDraft(init);
    setOpenId(m.id);
    setMode("enter");
  };

  const openForReview = async (m) => {
    const { data: r } = await supabase.from("match_results").select("*, profiles(name, ff_uid)").eq("match_id", m.id).order("prize", { ascending: false });
    setOpenResults(r || []);
    setOpenId(m.id);
    setMode("review");
  };

  const submitResults = async (m) => {
    const results = Object.entries(draft).map(([user_id, r]) => ({ user_id, kills: Number(r.kills || 0), winner: !!r.winner }));
    const { error } = await supabase.rpc("submit_match_results", { p_match_id: m.id, p_results: results });
    if (error) return showToast(error.message);
    showToast("Results submitted — review and approve to release payment");
    setOpenId(null);
    load();
  };

  const approveResults = async (m) => {
    const { error } = await supabase.rpc("approve_match_results", { p_match_id: m.id });
    if (error) return showToast(error.message);
    showToast("Approved — prizes have been paid out");
    setOpenId(null);
    load();
  };

  const notSubmitted = matches.filter((m) => !m.results_submitted_at && !m.completed);
  const awaitingApproval = matches.filter((m) => m.results_submitted_at && !m.completed);
  const completedMatches = matches.filter((m) => m.completed);

  if (openId && mode === "enter") {
    const m = matches.find((x) => x.id === openId);
    if (!m) return null;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setOpenId(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><ChevronLeft size={20} color={textPrimary} /></button>
          <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0 }}>{m.name}</p>
        </div>
        <p style={{ fontSize: 11, color: textMuted, marginTop: -8, marginBottom: 14 }}>This just saves a draft — no money moves until you approve it on the next screen.</p>
        {openPlayers.length === 0 && <p style={{ fontSize: 13, color: textMuted }}>No players registered.</p>}
        {openPlayers.map((p) => (
          <div key={p.user_id} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>{p.profiles?.name} <span style={{ color: textMuted, fontWeight: 400 }}>· UID {p.profiles?.ff_uid || "not set"}</span></p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: textSecondary }}>Kills</label>
                <input style={inputStyle} type="number" value={draft[p.user_id]?.kills ?? 0} onChange={(e) => setDraft({ ...draft, [p.user_id]: { ...draft[p.user_id], kills: e.target.value } })} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: textSecondary, marginTop: 14 }}>
                <input type="checkbox" checked={!!draft[p.user_id]?.winner} onChange={(e) => setDraft({ ...draft, [p.user_id]: { ...draft[p.user_id], winner: e.target.checked } })} />
                Winner
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => submitResults(m)} style={{ ...btnPrimary, width: "100%", marginTop: 8 }}>Submit for approval</button>
      </div>
    );
  }

  if (openId && mode === "review") {
    const m = matches.find((x) => x.id === openId);
    if (!m) return null;
    const totalPayout = openResults.reduce((s, r) => s + Number(r.prize || 0), 0);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setOpenId(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><ChevronLeft size={20} color={textPrimary} /></button>
          <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0 }}>{m.name}</p>
        </div>
        <p style={{ fontSize: 11, color: amber, marginTop: -8, marginBottom: 14 }}>Second confirmation — approving this pays out {money(totalPayout)} total, right now.</p>
        {openResults.map((r) => (
          <div key={r.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: bg1, border: `0.5px solid ${border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{r.profiles?.name} {r.winner && <span style={{ color: amber }}>★</span>}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>UID {r.profiles?.ff_uid || "not set"} · {r.kills} kills</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.prize > 0 ? green : textMuted }}>{r.prize > 0 ? money(r.prize) : "—"}</span>
          </div>
        ))}
        <button onClick={() => approveResults(m)} style={{ width: "100%", background: green, color: bg0, border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
          Approve & release {money(totalPayout)}
        </button>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>Awaiting results entry</SectionLabel>
      {notSubmitted.length === 0 && <p style={{ fontSize: 13, color: textMuted, marginBottom: 20 }}>Nothing pending.</p>}
      {notSubmitted.map((m) => (
        <button key={m.id} onClick={() => openForEntry(m)} style={{ width: "100%", textAlign: "left", background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
          <p style={{ fontSize: 11, color: textSecondary, margin: "3px 0 0" }}>tap to enter kills</p>
        </button>
      ))}

      <SectionLabel>Awaiting your approval</SectionLabel>
      {awaitingApproval.length === 0 && <p style={{ fontSize: 13, color: textMuted, marginBottom: 20 }}>Nothing waiting on you.</p>}
      {awaitingApproval.map((m) => (
        <button key={m.id} onClick={() => openForReview(m)} style={{ width: "100%", textAlign: "left", background: bg1, border: `0.5px solid ${amber}55`, borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
          <p style={{ fontSize: 11, color: amber, margin: "3px 0 0" }}>results submitted — tap to review and approve payout</p>
        </button>
      ))}

      <SectionLabel>Completed</SectionLabel>
      {completedMatches.map((m) => (
        <div key={m.id} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
          <p style={{ fontSize: 11, color: green, margin: "3px 0 0" }}>paid out</p>
        </div>
      ))}
    </div>
  );
}

function DepositsPage({ showToast }) {
  const [deposits, setDeposits] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("deposits").select("*, profiles(name, ff_uid)").order("created_at", { ascending: false });
    setDeposits(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (d) => { const { error } = await supabase.rpc("approve_deposit", { p_deposit_id: d.id }); if (error) return showToast(error.message); showToast(`Approved ${money(d.amount)}`); load(); };
  const reject = async (d) => { const { error } = await supabase.rpc("reject_deposit", { p_deposit_id: d.id }); if (error) return showToast(error.message); showToast("Rejected"); load(); };

  const pending = deposits.filter((d) => d.status === "pending");
  const resolved = deposits.filter((d) => d.status !== "pending");
  return (
    <div>
      <SectionLabel>Pending deposit requests</SectionLabel>
      {pending.length === 0 && <p style={{ fontSize: 13, color: textMuted, marginBottom: 20 }}>Nothing waiting on you.</p>}
      {pending.map((d) => (
        <div key={d.id} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>{money(d.amount)}</p>
          <p style={{ fontSize: 11, color: textSecondary, margin: "3px 0 0" }}>{d.profiles?.name} · UID {d.profiles?.ff_uid || "not set"}</p>
          <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>trx: {d.trx_id} · {new Date(d.created_at).toLocaleString()}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => approve(d)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: green, color: bg0, border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Check size={14} />Approve</button>
            <button onClick={() => reject(d)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", color: red, border: `0.5px solid ${red}`, borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Ban size={14} />Reject</button>
          </div>
        </div>
      ))}
      <SectionLabel>History</SectionLabel>
      {resolved.map((d) => (
        <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `0.5px solid ${border}` }}>
          <span style={{ fontSize: 12, color: textSecondary }}>{d.profiles?.name} · {money(d.amount)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: d.status === "approved" ? green : red, textTransform: "capitalize" }}>{d.status}</span>
        </div>
      ))}
    </div>
  );
}

function WithdrawalsPage({ showToast }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("withdrawals").select("*, profiles(name, ff_uid)").order("created_at", { ascending: false });
    setWithdrawals(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (w) => { const { error } = await supabase.rpc("approve_withdrawal", { p_withdrawal_id: w.id }); if (error) return showToast(error.message); showToast("Marked as sent"); load(); };
  const reject = async (w) => { const { error } = await supabase.rpc("reject_withdrawal", { p_withdrawal_id: w.id }); if (error) return showToast(error.message); showToast("Rejected — refunded"); load(); };

  const pending = withdrawals.filter((w) => w.status === "pending");
  const resolved = withdrawals.filter((w) => w.status !== "pending");
  return (
    <div>
      <SectionLabel>Pending withdrawal requests</SectionLabel>
      <p style={{ fontSize: 11, color: textMuted, marginTop: -8, marginBottom: 14 }}>Balance is already reserved. Approving confirms you sent the money manually — rejecting refunds it automatically.</p>
      {pending.length === 0 && <p style={{ fontSize: 13, color: textMuted, marginBottom: 20 }}>Nothing waiting on you.</p>}
      {pending.map((w) => (
        <div key={w.id} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>{money(w.amount)}</p>
          <p style={{ fontSize: 11, color: textSecondary, margin: "3px 0 0" }}>{w.profiles?.name} · UID {w.profiles?.ff_uid || "not set"}</p>
          <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>send to: {w.payout_number} · {new Date(w.created_at).toLocaleString()}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => approve(w)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: green, color: bg0, border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Check size={14} />Mark sent</button>
            <button onClick={() => reject(w)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", color: red, border: `0.5px solid ${red}`, borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Ban size={14} />Reject</button>
          </div>
        </div>
      ))}
      <SectionLabel>History</SectionLabel>
      {resolved.map((w) => (
        <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `0.5px solid ${border}` }}>
          <span style={{ fontSize: 12, color: textSecondary }}>{w.profiles?.name} · {money(w.amount)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: w.status === "approved" ? green : red, textTransform: "capitalize" }}>{w.status}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentPage({ showToast }) {
  const [form, setForm] = useState({ method: "bKash", number: "", instructions: "" });
  useEffect(() => { (async () => { const { data } = await supabase.from("payment_settings").select("*").eq("id", 1).single(); if (data) setForm(data); })(); }, []);
  const save = async () => {
    const { error } = await supabase.from("payment_settings").update({ method: form.method, number: form.number, instructions: form.instructions }).eq("id", 1);
    if (error) return showToast(error.message);
    showToast("Payment instructions updated");
  };
  return (
    <div>
      <SectionLabel>Deposit instructions</SectionLabel>
      <p style={{ fontSize: 11, color: textMuted, marginTop: -8, marginBottom: 14 }}>Shown to players when they tap "Add money".</p>
      <Field label="Method"><select style={inputStyle} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank transfer</option></select></Field>
      <Field label="Number / account"><input style={inputStyle} value={form.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
      <Field label="Instructions shown to players"><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.instructions || ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
      <button onClick={save} style={{ ...btnPrimary, width: "100%" }}>Save payment settings</button>
    </div>
  );
}

function BannersPage({ showToast }) {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState({ title: "", subtitle: "", cta_text: "Watch now", link: "" });
  const load = useCallback(async () => { const { data } = await supabase.from("banners").select("*").order("created_at", { ascending: false }); setBanners(data || []); }, []);
  useEffect(() => { load(); }, [load]);

  const addBanner = async () => {
    if (!form.title.trim()) return showToast("Give the banner a title");
    const { error } = await supabase.from("banners").insert(form);
    if (error) return showToast(error.message);
    setForm({ title: "", subtitle: "", cta_text: "Watch now", link: "" });
    showToast("Banner added");
    load();
  };
  const removeBanner = async (id) => { await supabase.from("banners").delete().eq("id", id); showToast("Banner removed"); load(); };

  return (
    <div>
      <SectionLabel>Add banner</SectionLabel>
      <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="How to get your match room ID" /></Field>
      <Field label="Subtitle"><input style={inputStyle} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Button text"><input style={inputStyle} value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} /></Field>
        <Field label="Link"><input style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" /></Field>
      </div>
      <button onClick={addBanner} style={{ ...btnPrimary, width: "100%", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={15} />Add banner</button>

      <SectionLabel>Active banners</SectionLabel>
      {banners.map((b) => (
        <div key={b.id} style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
          <div><p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{b.title}</p>{b.subtitle && <p style={{ fontSize: 11, color: textSecondary, margin: "2px 0 0" }}>{b.subtitle}</p>}</div>
          <button onClick={() => removeBanner(b.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color={red} /></button>
        </div>
      ))}
    </div>
  );
}
