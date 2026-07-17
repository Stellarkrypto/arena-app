import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Play, Calendar, BarChart3, User, CheckCircle2, Swords } from "lucide-react";
import { useAuth } from "../AuthContext";
import { bg0, bg1, bg2, border, purple, purpleDeep, pink, green, textPrimary, textMuted, money } from "../theme";

export default function Layout() {
  const { balance } = useAuth();

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: bg0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `0.5px solid ${border}`, background: bg1, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${purple}, ${pink})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Swords size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Arena</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: bg2, borderRadius: 20, padding: "5px 12px 5px 6px" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={12} color={bg0} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{money(balance)}</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "16px 16px 8px", overflowY: "auto" }}>
        <Outlet />
      </div>

      <div style={{ display: "flex", padding: "10px 10px", borderTop: `0.5px solid ${border}`, background: bg1, position: "sticky", bottom: 0 }}>
        {[
          { to: "/", label: "Home", icon: Play, end: true },
          { to: "/matches", label: "My Matches", icon: Calendar },
          { to: "/result", label: "Result", icon: BarChart3 },
          { to: "/profile", label: "Profile", icon: User },
        ].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} style={{ flex: 1, textDecoration: "none" }}>
            {({ isActive }) => (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 12,
                background: isActive ? `linear-gradient(135deg, ${purple}, ${purpleDeep})` : "transparent",
              }}>
                <t.icon size={17} color={isActive ? "#fff" : textMuted} />
                <span style={{ fontSize: 10, fontWeight: 500, color: isActive ? "#fff" : textMuted }}>{t.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
