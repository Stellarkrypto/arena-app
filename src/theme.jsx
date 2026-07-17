export const bg0 = "#0c0e1a";
export const bg1 = "#141830";
export const bg2 = "#1a1f3d";
export const border = "#262c4d";
export const purple = "#7B61FF";
export const purpleDeep = "#5B4BD6";
export const pink = "#E85BA0";
export const green = "#2ecc9a";
export const red = "#e2504a";
export const amber = "#f5a623";
export const textPrimary = "#f2f3fb";
export const textSecondary = "#9498b8";
export const textMuted = "#5f6489";

export const money = (n) => `৳${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
export const tagFor = (id) => `#${(id || "").replace(/-/g, "").slice(0, 5).toUpperCase()}`;

export const MODES = [
  { key: "br", label: "BR Match" },
  { key: "clash", label: "Clash Squad" },
  { key: "lonewolf", label: "Lone Wolf" },
  { key: "cs1v1", label: "CS 1v1 / 2v2" },
];

export const inputStyle = {
  width: "100%", background: bg1, border: `0.5px solid ${border}`, borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: textPrimary, outline: "none", boxSizing: "border-box",
};
export const btnPrimary = {
  background: `linear-gradient(135deg, ${purple}, ${purpleDeep})`, color: "#fff", border: "none",
  borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: textSecondary, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
export function SectionLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>{children}</p>;
}
