import React, { useEffect, useState, useCallback } from "react";
import { Plus, ArrowDownToLine, Receipt, FileEdit, Star, LogOut, Trophy, Copy, ChevronLeft, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { bg0, bg1, bg2, border, purple, purpleDeep, pink, green, red, textPrimary, textSecondary, textMuted, money, inputStyle, btnPrimary, Field, SectionLabel, cardShadow } from "../theme";

export default function Profile() {
  const { session, profile, balance, refresh, signOut, authError } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [txns, setTxns] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [nameDraft, setNameDraft] = useState(profile?.name || "");
  const [ffUidDraft, setFfUidDraft] = useState(profile?.ff_uid || "");
  const [limitDraft, setLimitDraft] = useState(profile?.daily_limit || 500);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  useEffect(() => {
    setNameDraft(profile?.name || ""); setFfUidDraft(profile?.ff_uid || ""); setLimitDraft(profile?.daily_limit || 500);
  }, [profile]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("wallet_transactions").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    setTxns(data || []);
  }, [session]);

  const loadPaymentSettings = useCallback(async () => {
    const { data } = await supabase.from("payment_settings").select("*").eq("id", 1).single();
    setPaymentSettings(data);
  }, []);

  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);
  useEffect(() => { if (modal === "deposit") loadPaymentSettings(); }, [modal, loadPaymentSettings]);

  const saveProfile = async () => {
    await supabase.from("profiles").update({ name: nameDraft, ff_uid: ffUidDraft, daily_limit: Number(limitDraft) || 500 }).eq("id", session.user.id);
    setEditing(false);
    refresh();
    showToast("Profile updated");
  };

  const submitDeposit = async (amt, trxId) => {
    await supabase.from("deposits").insert({ user_id: session.user.id, amount: amt, trx_id: trxId });
    showToast("Deposit request submitted — awaiting admin approval");
    setModal(null);
  };
  const submitWithdraw = async (amt, number) => {
    const { error } = await supabase.rpc("request_withdrawal", { p_amount: amt, p_number: number });
    if (error) return showToast(error.message.replace(/^.*: /, ""));
    showToast(`${money(amt)} reserved — awaiting admin approval`);
    setModal(null);
    refresh();
  };

  if (!profile) {
    return (
      <div>
        <p style={{ fontSize: 13, color: textMuted }}>Loading…</p>
        {authError && (
          <div style={{ marginTop: 12, padding: 12, background: bg1, border: `0.5px solid ${red}`, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: red, margin: 0 }}>Error: {authError}</p>
          </div>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronLeft size={20} color={textPrimary} /></button>
          <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: 0 }}>Edit profile</p>
        </div>
        <Field label="Display name"><input style={inputStyle} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} /></Field>
        <Field label="Free Fire UID"><input style={inputStyle} value={ffUidDraft} onChange={(e) => setFfUidDraft(e.target.value)} placeholder="e.g. 123456789" /></Field>
        <Field label={`Daily spend limit · ${money(limitDraft)}`}>
          <input style={{ width: "100%" }} type="range" min="50" max="5000" step="50" value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} />
        </Field>
        <button onClick={saveProfile} style={{ ...btnPrimary, width: "100%", marginTop: 8 }}>Save changes</button>
      </div>
    );
  }

  if (showHistory) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronLeft size={20} color={textPrimary} /></button>
          <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: 0 }}>Transaction history</p>
        </div>
        {txns.length === 0 && <p style={{ fontSize: 13, color: textMuted }}>No transactions yet.</p>}
        {txns.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `0.5px solid ${border}` }}>
            <div>
              <p style={{ fontSize: 13, color: textPrimary, margin: 0 }}>{t.note}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>{new Date(t.created_at).toLocaleString()}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.amount >= 0 ? green : red }}>{t.amount >= 0 ? "+" : ""}{money(t.amount)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {toast && <div style={{ marginBottom: 10, padding: "10px 14px", background: bg2, border: `0.5px solid ${purple}55`, color: textPrimary, fontSize: 13, borderRadius: 10, textAlign: "center" }}>{toast}</div>}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: `linear-gradient(135deg, ${purple}, ${pink})`, padding: 3, marginBottom: 10 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: bg0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26, color: textPrimary }}>
            {(profile.name || "P")[0].toUpperCase()}
          </div>
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: 0 }}>{profile.name}</p>
        <div onClick={() => { navigator.clipboard?.writeText(profile.ff_uid || ""); showToast("UID copied"); }} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: textMuted, cursor: "pointer" }}>
          UID: {profile.ff_uid || "not set"} <Copy size={11} />
        </div>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${bg2} 0%, ${bg1} 60%, ${purple}22 100%)`,
        border: `0.5px solid ${border}`, borderRadius: 18, padding: "20px 20px 18px", marginBottom: 14,
        boxShadow: cardShadow, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `${purple}14` }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div style={{ width: 34, height: 26, borderRadius: 6, background: "linear-gradient(135deg, #e8c568, #b8912f)", position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: 4, right: 4, height: 1, background: "#00000033" }} />
            <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 1, background: "#00000033" }} />
          </div>
          <button onClick={() => setModal("deposit")} style={{ width: 34, height: 34, borderRadius: "50%", background: green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${green}55` }}>
            <Plus size={18} color={bg0} />
          </button>
        </div>

        <p style={{ fontSize: 10, color: textMuted, letterSpacing: "0.08em", margin: "16px 0 0", textTransform: "uppercase" }}>Total balance</p>
        <p style={{ fontSize: 30, fontWeight: 700, color: textPrimary, margin: "4px 0 0", letterSpacing: "0.02em" }}>{money(balance)}</p>

        <div style={{ display: "flex", gap: 28, marginTop: 16 }}>
          <div>
            <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deposited</p>
            <p style={{ fontSize: 13, color: textPrimary, margin: "2px 0 0", fontWeight: 600 }}>{money(profile.deposited || 0)}</p>
          </div>
          <div>
            <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Winnings</p>
            <p style={{ fontSize: 13, color: green, margin: "2px 0 0", fontWeight: 600 }}>{money(profile.winnings || 0)}</p>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Card holder</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.03em" }}>{profile.name || "Player"}</p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, fontStyle: "italic", color: `${purple}cc`, margin: 0, letterSpacing: "0.02em" }}>Arena</p>
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: textMuted }}>
            <span>Daily limit used</span><span>{money(profile.daily_spent)} / {money(profile.daily_limit)}</span>
          </div>
        </div>
      </div>

      <SectionLabel>Wallet</SectionLabel>
      <MenuRow icon={<Plus size={18} color={green} />} iconBg={`${green}22`} title="Add money" subtitle="Top up your wallet balance" onClick={() => setModal("deposit")} />
      <MenuRow icon={<ArrowDownToLine size={18} color={red} />} iconBg={`${red}22`} title="Withdraw" subtitle="Transfer money to your bank" onClick={() => setModal("withdraw")} />
      <MenuRow icon={<Receipt size={18} color={purple} />} iconBg={`${purple}22`} title="Transaction history" subtitle="View your wallet credits and debits" onClick={() => setShowHistory(true)} />

      <SectionLabel>Account</SectionLabel>
      <MenuRow icon={<FileEdit size={18} color={pink} />} iconBg={`${pink}22`} title="Edit profile" subtitle="Update your name, UID and daily limit" onClick={() => setEditing(true)} />
      <MenuRow icon={<Star size={18} color="#f5a623" />} iconBg="#f5a62322" title="Leaderboard" subtitle="See top players this week" onClick={() => showToast("See the Result tab")} />
      <MenuRow icon={<LogOut size={18} color={red} />} iconBg={`${red}22`} title="Log out" subtitle="Sign out of your account" onClick={signOut} />

      {modal === "deposit" && <DepositModal paymentSettings={paymentSettings} onSubmit={submitDeposit} onClose={() => setModal(null)} />}
      {modal === "withdraw" && <WithdrawModal balance={balance} onSubmit={submitWithdraw} onClose={() => setModal(null)} />}
    </div>
  );
}

function MenuRow({ icon, iconBg, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: bg1, border: `0.5px solid ${border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.22)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div><p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{title}</p><p style={{ fontSize: 11, color: textSecondary, margin: "2px 0 0" }}>{subtitle}</p></div>
    </button>
  );
}

function DepositModal({ paymentSettings, onSubmit, onClose }) {
  const [amt, setAmt] = useState(""); const [trxId, setTrxId] = useState(""); const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const n = Number(amt);
    if (!n || n <= 0) return setErr("Enter a valid amount.");
    if (!trxId.trim()) return setErr("Enter the transaction ID from your payment.");
    if (submitting) return;
    setSubmitting(true);
    try { await onSubmit(n, trxId.trim()); } finally { setSubmitting(false); }
  };
  return (
    <ModalShell title="Add money" onClose={onClose}>
      {paymentSettings?.number ? (
        <div style={{ background: bg0, border: `0.5px solid ${border}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", margin: "0 0 6px" }}>Send payment to</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0 }}>{paymentSettings.method} · {paymentSettings.number}</p>
          {paymentSettings.instructions && <p style={{ fontSize: 11, color: textSecondary, margin: "8px 0 0" }}>{paymentSettings.instructions}</p>}
        </div>
      ) : <p style={{ fontSize: 11, color: textMuted, marginBottom: 16 }}>Admin hasn't published payment details yet.</p>}
      <Field label="Amount you sent"><input style={inputStyle} type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="৳ 0" autoFocus /></Field>
      <Field label="Transaction ID"><input style={inputStyle} value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7K2P1QXR" /></Field>
      {err && <p style={{ fontSize: 12, color: red, margin: "-6px 0 12px" }}>{err}</p>}
      <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, width: "100%", opacity: submitting ? 0.6 : 1 }}>
        {submitting ? "Submitting…" : "Submit deposit request"}
      </button>
    </ModalShell>
  );
}

function WithdrawModal({ balance, onSubmit, onClose }) {
  const [amt, setAmt] = useState(""); const [number, setNumber] = useState(""); const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const n = Number(amt);
    if (!n || n <= 0) return setErr("Enter a valid amount.");
    if (n > balance) return setErr(`You only have ${money(balance)} available.`);
    if (!number.trim()) return setErr("Enter the number to send your withdrawal to.");
    if (submitting) return;
    setSubmitting(true);
    try { await onSubmit(n, number.trim()); } finally { setSubmitting(false); }
  };
  return (
    <ModalShell title="Withdraw" onClose={onClose}>
      <p style={{ fontSize: 12, color: textSecondary, marginBottom: 14 }}>Available: <span style={{ color: textPrimary, fontWeight: 700 }}>{money(balance)}</span></p>
      <Field label="Amount"><input style={inputStyle} type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="৳ 0" autoFocus /></Field>
      <Field label="Send to (bKash/Nagad number)"><input style={inputStyle} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
      {err && <p style={{ fontSize: 12, color: red, margin: "-6px 0 12px" }}>{err}</p>}
      <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, width: "100%", opacity: submitting ? 0.6 : 1 }}>
        {submitting ? "Submitting…" : "Request withdrawal"}
      </button>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
      <div style={{ background: bg1, border: `0.5px solid ${border}`, borderRadius: 16, padding: 20, width: "86%", maxWidth: 360, maxHeight: "84vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={textMuted} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
