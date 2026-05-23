import { useEffect, useRef } from 'react';

// Soft drifting "fireflies" — gentle green particles for the nature theme.
// Kept the StarField filename so existing imports work; behavior is now ambient
// rather than space-stars.
const PARTICLE_COLORS = ['#86efac', '#34d399', '#a7f3d0', '#6ee7b7', '#bbf7d0'];

export default function StarField({ density = 70, speed = 0.025, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let particles = [];

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const seed = () => {
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: Math.random() * 0.9 + 0.2,
        r: Math.random() * 1.2 + 0.3,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        sway: (Math.random() - 0.5) * 0.15,
      }));
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.y -= speed * p.z;
        p.x += Math.sin(t * 0.0008 + p.phase) * p.sway;
        if (p.y < -2) {
          p.y = window.innerHeight + 2;
          p.x = Math.random() * window.innerWidth;
        }
        const flicker = 0.35 + 0.35 * Math.sin(t * 0.0016 + p.phase);
        ctx.globalAlpha = flicker * p.z * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
      aria-hidden="true"
    />
  );
}
