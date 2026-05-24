// Intentionally a no-op. GitHub has no animated background.
// File kept (vs. removing) so existing imports in AppLayout.jsx and Login.jsx
// don't need to change. Same default-export signature; accepts and ignores
// the old props (density, speed, className) for call-site compatibility.
export default function StarField() {
  return null;
}
