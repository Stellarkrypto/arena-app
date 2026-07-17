import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(p || null);
    const { data: bal } = await supabase.from("wallet_balances").select("balance").eq("user_id", userId).maybeSingle();
    setBalance(bal?.balance || 0);
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) { setAuthError(error.message); setSession(null); return; }
        setSession(data.session ?? null);
      })
      .catch((err) => { setAuthError(String(err)); setSession(null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadProfile(session.user.id);
    else { setProfile(null); setBalance(0); }
  }, [session, loadProfile]);

  const refresh = useCallback(() => {
    if (session) loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return error;
  };
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthCtx.Provider value={{ session, profile, balance, refresh, signUp, signIn, signOut, authError }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
