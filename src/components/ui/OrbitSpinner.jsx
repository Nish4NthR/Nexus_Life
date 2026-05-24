export default function OrbitSpinner({ size = 48, className = '' }) {
  const s = `${size}px`;
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: s, height: s }}
      role="status"
      aria-label="Loading"
    >
      <div className="absolute inset-0 rounded-full border border-nebula-violet/40" />
      <div
        className="absolute inset-0 rounded-full border-2 border-transparent animate-orbit"
        style={{
          borderTopColor: '#39ff14',
          borderRightColor: '#00cc44',
        }}
      />
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-nebula-violet shadow-glow animate-orbit"
        style={{ width: 6, height: 6 }}
      />
    </div>
  );
}
