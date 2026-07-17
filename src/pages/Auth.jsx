import React, { useState } from "react";
import { Swords } from "lucide-react";
import { useAuth } from "../AuthContext";
import { bg0, bg1, border, purple, purpleDeep, textPrimary, textSecondary, textMuted, red, inputStyle, btnPrimary, Field } from "../theme";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) return setErr("Enter your email and password.");
    setBusy(true);
    setErr("");
    const error = mode === "login" ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim() || "Player");
    setBusy(false);
    if (error) return setErr(error.message);
    if (mode === "signup") setSentConfirm(true);
  };

  return (
    <div style={{ width: "100%", maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", background: bg0, border: `0.5px solid ${border}`, borderRadius: 20, padding: "40px 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${purple}, ${purpleDeep})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Swords size={22} color="#fff" />
          </div>
          <p style={{ fontSize: 19, fontWeight: 700, color: textPrimary, margin: 0 }}>Arena</p>
          <p style={{ fontSize: 12, color: textMuted, margin: "4px 0 0" }}>{mode === "login" ? "Log in to your account" : "Create your account"}</p>
        </div>

        {sentConfirm ? (
          <p style={{ fontSize: 13, color: textSecondary, textAlign: "center" }}>
            Check your email to confirm your account, then log in.
          </p>
        ) : (
          <>
            {mode === "signup" && (
              <Field label="Display name"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></Field>
            )}
            <Field label="Email"><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Field label="Password"><input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
            {err && <p style={{ fontSize: 12, color: red, margin: "-6px 0 12px" }}>{err}</p>}
            <button onClick={submit} disabled={busy} style={{ ...btnPrimary, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </>
        )}

        <p style={{ fontSize: 12, color: textMuted, textAlign: "center", marginTop: 18 }}>
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <span
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); setSentConfirm(false); }}
            style={{ color: purple, cursor: "pointer", fontWeight: 600 }}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </span>
        </p>
      </div>
    </div>
  );
}
