import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import MyMatches from "./pages/MyMatches";
import Result from "./pages/Result";
import Profile from "./pages/Profile";
import MatchDetail from "./pages/MatchDetail";
import Admin from "./pages/Admin";

export default function App() {
  const { session, authError } = useAuth();

  if (session === undefined) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "#5f6489" }}>
        Loading…
        {authError && (
          <div style={{ marginTop: 12, color: "#e2504a" }}>
            Connection error: {authError}
            <div style={{ marginTop: 8, color: "#5f6489" }}>
              This usually means VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY
              is missing or wrong in Vercel's Environment Variables.
            </div>
          </div>
        )}
      </div>
    );
  }
  if (session === null) {
    return <Auth />;
  }

  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/matches" element={<MyMatches />} />
        <Route path="/result" element={<Result />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/match/:id" element={<MatchDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
