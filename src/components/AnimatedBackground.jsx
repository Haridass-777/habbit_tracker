import { useEffect, useRef } from 'react';

// Glacier-blue + neon-pink live background.
//  - big soft orbs drift slowly and lean toward the cursor (parallax)
//  - small glowing particles float around, link up when close, and get pushed away by the cursor
//  - a glowing halo follows the cursor
// Pure canvas, no dependencies. Pauses when the tab is hidden, and is a static glow if the
// user prefers reduced motion.

const BLUE = [56, 189, 248];
const PINK = [255, 79, 163];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function AnimatedBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let particles = [];
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };

    const orbs = [
      { c: BLUE, r: 0.34, fx: 0.00018, fy: 0.00023, px: 0.2, py: 0.2, ph: 0 },
      { c: PINK, r: 0.30, fx: 0.00021, fy: 0.00016, px: 0.8, py: 0.3, ph: 2 },
      { c: BLUE, r: 0.28, fx: 0.00015, fy: 0.00020, px: 0.7, py: 0.85, ph: 4 },
      { c: PINK, r: 0.26, fx: 0.00019, fy: 0.00014, px: 0.15, py: 0.8, ph: 1 },
    ];

    const make = () => {
      const colour = Math.random() < 0.5 ? BLUE : PINK;
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 2.2, c: colour, tw: Math.random() * Math.PI * 2,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(90, Math.round((w * h) / 20000));
      while (particles.length < target) particles.push(make());
      particles.length = target;
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; };
    const onLeave = () => { mouse.active = false; };

    const frame = (t) => {
      const dark = document.documentElement.dataset.theme === 'dark';
      // Dark theme: additive light. Light theme: normal blending with softer alpha.
      const k = dark ? 1 : 0.55;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';

      // smooth cursor follow
      if (mouse.active) {
        if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
        mouse.sx += (mouse.x - mouse.sx) * 0.14;
        mouse.sy += (mouse.y - mouse.sy) * 0.14;
      }
      const lean = mouse.active ? { x: (mouse.sx / w - 0.5), y: (mouse.sy / h - 0.5) } : { x: 0, y: 0 };

      // orbs
      const size = Math.max(w, h);
      for (const o of orbs) {
        const x = (o.px + Math.sin(t * o.fx + o.ph) * 0.12 - lean.x * 0.08) * w;
        const y = (o.py + Math.cos(t * o.fy + o.ph) * 0.12 - lean.y * 0.08) * h;
        const r = o.r * size;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(o.c, 0.2 * k));
        g.addColorStop(1, rgba(o.c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // particles
      const reach = 170;
      for (const p of particles) {
        if (!reduce) {
          if (mouse.active) {
            const dx = p.x - mouse.sx;
            const dy = p.y - mouse.sy;
            const d2 = dx * dx + dy * dy;
            if (d2 < reach * reach && d2 > 1) {
              const d = Math.sqrt(d2);
              const f = (1 - d / reach) * 0.9;
              p.vx += (dx / d) * f * 0.35;
              p.vy += (dy / d) * f * 0.35;
            }
          }
          p.vx *= 0.985; p.vy *= 0.985;
          // keep a gentle drift so nothing freezes
          p.vx += (Math.random() - 0.5) * 0.012;
          p.vy += (Math.random() - 0.5) * 0.012;
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
        }
      }

      // links between nearby particles (blue -> pink gradient lines)
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            const al = (1 - Math.sqrt(d2) / 130) * 0.28 * k;
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, rgba(a.c, al));
            g.addColorStop(1, rgba(b.c, al));
            ctx.strokeStyle = g;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // glowing dots
      for (const p of particles) {
        const pulse = 0.65 + 0.35 * Math.sin(t * 0.002 + p.tw);
        const gr = p.r * 6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
        g.addColorStop(0, rgba(p.c, 0.9 * pulse * k));
        g.addColorStop(0.35, rgba(p.c, 0.25 * pulse * k));
        g.addColorStop(1, rgba(p.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, gr, 0, Math.PI * 2); ctx.fill();
      }

      // cursor halo: pink ring outside, blue core
      if (mouse.active && !reduce) {
        const r = 150;
        const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, r);
        g.addColorStop(0, rgba(BLUE, 0.28 * k));
        g.addColorStop(0.5, rgba(PINK, 0.12 * k));
        g.addColorStop(1, rgba(PINK, 0));
        ctx.fillStyle = g;
        ctx.fillRect(mouse.sx - r, mouse.sy - r, r * 2, r * 2);
      }

      ctx.globalCompositeOperation = 'source-over';
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="live-bg" aria-hidden="true" />;
}
