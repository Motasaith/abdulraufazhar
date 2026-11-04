"use client";

import { useEffect, useRef, useState } from "react";

/* A small space pinball table. Three planet bumpers, two flippers, three balls.
   Left half of the table works the left flipper, right half the right one.
   Keyboard: arrow keys or A / D to flip, space to launch. */

type V = { x: number; y: number };
type Phase = "ready" | "play" | "over";
type Bumper = { fx: number; fy: number; fr: number; hue: string; glow: string; x: number; y: number; r: number; flash: number };
type Flip = { dir: 1 | -1; px: number; py: number; len: number; a: number; up: boolean };

const LIVES = 3;
const BALL_R = 6;
const FLIP_R = 5;
const REST = (27 * Math.PI) / 180; // flipper hanging down
const LIFT = (-26 * Math.PI) / 180; // flipper raised
const FLIP_SPEED = 20; // rad/s

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Pinball() {
  const cv = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ reset: () => void } | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");

  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const fam = getComputedStyle(c).fontFamily || "monospace";

    let W = 300, H = 300, s = 1;
    const ball = { x: 0, y: 0, vx: 0, vy: 0, live: false };
    const bumpers: Bumper[] = [
      { fx: 0.28, fy: 0.27, fr: 17, hue: "#e8461e", glow: "255,122,82", x: 0, y: 0, r: 0, flash: 0 },
      { fx: 0.72, fy: 0.27, fr: 17, hue: "#4aa3ff", glow: "120,190,255", x: 0, y: 0, r: 0, flash: 0 },
      { fx: 0.5, fy: 0.44, fr: 15, hue: "#ffb454", glow: "255,200,120", x: 0, y: 0, r: 0, flash: 0 },
    ];
    const flips: Flip[] = [
      { dir: 1, px: 0, py: 0, len: 60, a: REST, up: false },
      { dir: -1, px: 0, py: 0, len: 60, a: REST, up: false },
    ];
    let guides: [V, V][] = [];
    const rand = rng(7);
    const stars = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), r: rand() * 1.1 + 0.3, p: rand() * 6.28 }));

    let ph: Phase = "ready";
    let sc = 0, bestSc = 0, lives = LIVES, stall = 0;
    let visible = false, running = false, raf = 0, last = 0, t = 0, acc = 0;
    const pointers = new Map<number, 0 | 1>();
    const keys = { l: false, r: false };

    const setPh = (p: Phase) => { ph = p; setPhase(p); };
    const addScore = (n: number) => { sc += n; setScore(sc); };

    function park() {
      ball.live = false;
      ball.x = W * 0.5;
      ball.y = H * 0.1;
      ball.vx = ball.vy = 0;
      stall = 0;
    }
    function launch() {
      if (ph === "over" || ball.live) return;
      ball.live = true;
      ball.vx = (Math.random() - 0.5) * 220 * s;
      ball.vy = 120 * s;
      if (ph === "ready") setPh("play");
    }
    function reset() {
      sc = 0; lives = LIVES;
      setScore(0);
      bumpers.forEach((b) => (b.flash = 0));
      flips.forEach((f) => { f.a = REST; f.up = false; });
      park();
      setPh("ready");
    }

    function layout() {
      s = H / 300;
      bumpers.forEach((b) => { b.x = b.fx * W; b.y = b.fy * H; b.r = b.fr * Math.min(1, W / 340) * (0.9 + 0.1 * s); });
      const py = H - 30 * Math.min(1, s + 0.2);
      const len = W * 0.19;
      flips[0].px = W * 0.28; flips[1].px = W * 0.72;
      flips.forEach((f) => { f.py = py; f.len = len; });
      guides = [
        [{ x: 0, y: H * 0.64 }, { x: flips[0].px - 5, y: py - 1 }],
        [{ x: W, y: H * 0.64 }, { x: flips[1].px + 5, y: py - 1 }],
        [{ x: 0, y: H * 0.2 }, { x: W * 0.2, y: 0 }],
        [{ x: W, y: H * 0.2 }, { x: W * 0.8, y: 0 }],
      ];
      if (!ball.live) { ball.x = W * 0.5; ball.y = H * 0.1; }
    }
    function size() {
      const r = c!.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      c!.width = Math.round(W * dpr);
      c!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    const tip = (f: Flip, d = f.len): V => ({ x: f.px + f.dir * d * Math.cos(f.a), y: f.py + d * Math.sin(f.a) });

    /* push the ball out of a capsule and bounce it; (sx, sy) is the surface velocity */
    function hitSeg(a: V, b: V, rr: number, e: number, svx = 0, svy = 0, k = 0) {
      const abx = b.x - a.x, aby = b.y - a.y;
      const l2 = abx * abx + aby * aby || 1;
      let u = ((ball.x - a.x) * abx + (ball.y - a.y) * aby) / l2;
      u = Math.max(0, Math.min(1, u));
      const cx = a.x + abx * u, cy = a.y + aby * u;
      let dx = ball.x - cx, dy = ball.y - cy;
      const dist = Math.hypot(dx, dy);
      const min = BALL_R + rr;
      if (dist >= min) return false;
      if (dist < 1e-4) { dx = 0; dy = -1; } else { dx /= dist; dy /= dist; }
      ball.x = cx + dx * min;
      ball.y = cy + dy * min;
      const sv = k ? { x: svx * u * k, y: svy * u * k } : { x: 0, y: 0 };
      const rvx = ball.vx - sv.x, rvy = ball.vy - sv.y;
      const vn = rvx * dx + rvy * dy;
      if (vn < 0) {
        ball.vx = sv.x + rvx - (1 + e) * vn * dx;
        ball.vy = sv.y + rvy - (1 + e) * vn * dy;
      }
      return true;
    }

    function step(dt: number) {
      // flippers
      flips.forEach((f, i) => {
        const want = i === 0 ? keys.l || [...pointers.values()].includes(0) : keys.r || [...pointers.values()].includes(1);
        f.up = want;
        const target = f.up ? LIFT : REST;
        const prev = f.a;
        const d = FLIP_SPEED * dt;
        f.a = f.a < target ? Math.min(target, f.a + d) : Math.max(target, f.a - d);
        (f as Flip & { w?: number }).w = (f.a - prev) / dt;
      });
      bumpers.forEach((b) => { b.flash = Math.max(0, b.flash - dt * 4); });
      if (!ball.live) return;

      ball.vy += 780 * s * dt;
      const sp = Math.hypot(ball.vx, ball.vy), cap = 980 * s;
      if (sp > cap) { ball.vx *= cap / sp; ball.vy *= cap / sp; }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // walls
      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; }
      if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }
      if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * 0.7; }

      guides.forEach(([a, b]) => hitSeg(a, b, 2, 0.45));

      for (const b of bumpers) {
        const dx = ball.x - b.x, dy = ball.y - b.y;
        const dist = Math.hypot(dx, dy), min = BALL_R + b.r;
        if (dist < min) {
          const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : -1;
          ball.x = b.x + nx * min; ball.y = b.y + ny * min;
          const vn = ball.vx * nx + ball.vy * ny;
          if (vn < 0) { ball.vx -= 2.2 * vn * nx; ball.vy -= 2.2 * vn * ny; }
          const out = ball.vx * nx + ball.vy * ny, kick = 300 * s;
          if (out < kick) { ball.vx += nx * (kick - out); ball.vy += ny * (kick - out); }
          b.flash = 1;
          addScore(100);
        }
      }

      flips.forEach((f) => {
        const w = (f as Flip & { w?: number }).w || 0;
        const a = { x: f.px, y: f.py }, b = tip(f);
        // surface velocity per unit of distance along the flipper
        const svx = -f.dir * f.len * Math.sin(f.a) * w;
        const svy = f.len * Math.cos(f.a) * w;
        hitSeg(a, b, FLIP_R, 0.35, svx, svy, 1);
      });

      // stuck ball: give it a nudge
      if (Math.hypot(ball.vx, ball.vy) < 24 * s) {
        stall += dt;
        if (stall > 2.2) { ball.vx += (Math.random() - 0.5) * 340 * s; ball.vy -= 220 * s; stall = 0; }
      } else stall = 0;

      // drain
      if (ball.y > H + BALL_R * 2) {
        lives -= 1;
        if (lives > 0) { park(); }
        else {
          ball.live = false;
          if (sc > bestSc) { bestSc = sc; setBest(sc); }
          setPh("over");
        }
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      // nebula glow
      const g1 = ctx!.createRadialGradient(W * 0.2, H * 0.35, 0, W * 0.2, H * 0.35, W * 0.55);
      g1.addColorStop(0, "rgba(232,70,30,.16)"); g1.addColorStop(1, "rgba(232,70,30,0)");
      ctx!.fillStyle = g1; ctx!.fillRect(0, 0, W, H);
      const g2 = ctx!.createRadialGradient(W * 0.85, H * 0.5, 0, W * 0.85, H * 0.5, W * 0.6);
      g2.addColorStop(0, "rgba(74,163,255,.14)"); g2.addColorStop(1, "rgba(74,163,255,0)");
      ctx!.fillStyle = g2; ctx!.fillRect(0, 0, W, H);
      // stars
      stars.forEach((st) => {
        ctx!.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.8 + st.p));
        ctx!.fillStyle = "#fff";
        ctx!.beginPath(); ctx!.arc(st.x * W, st.y * H, st.r, 0, 6.2832); ctx!.fill();
      });
      ctx!.globalAlpha = 1;

      // guides
      ctx!.lineCap = "round";
      guides.forEach(([a, b]) => {
        ctx!.strokeStyle = "rgba(255,255,255,.28)"; ctx!.lineWidth = 3;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
      });

      // planets
      bumpers.forEach((b) => {
        const R = b.r * (1 + b.flash * 0.14);
        ctx!.save();
        ctx!.shadowColor = `rgba(${b.glow},${0.35 + b.flash * 0.6})`;
        ctx!.shadowBlur = 14 + b.flash * 18;
        const g = ctx!.createRadialGradient(b.x - R * 0.35, b.y - R * 0.4, R * 0.1, b.x, b.y, R);
        g.addColorStop(0, "#fff"); g.addColorStop(0.25, b.hue); g.addColorStop(1, "rgba(0,0,0,.65)");
        ctx!.fillStyle = g;
        ctx!.beginPath(); ctx!.arc(b.x, b.y, R, 0, 6.2832); ctx!.fill();
        ctx!.restore();
        ctx!.strokeStyle = `rgba(${b.glow},${0.5 + b.flash * 0.5})`; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.ellipse(b.x, b.y, R * 1.5, R * 0.42, -0.4, 0, 6.2832); ctx!.stroke();
      });

      // flippers
      flips.forEach((f) => {
        const a = { x: f.px, y: f.py }, b = tip(f);
        ctx!.strokeStyle = "#e8461e"; ctx!.lineWidth = FLIP_R * 2 + 1;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
        ctx!.strokeStyle = "rgba(255,255,255,.55)"; ctx!.lineWidth = 2;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y - 1.5); ctx!.lineTo(b.x, b.y - 1.5); ctx!.stroke();
        ctx!.fillStyle = "#fff"; ctx!.beginPath(); ctx!.arc(a.x, a.y, 3, 0, 6.2832); ctx!.fill();
      });

      // ball
      ctx!.save();
      ctx!.shadowColor = "rgba(255,255,255,.9)"; ctx!.shadowBlur = 12;
      const bg = ctx!.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x, ball.y, BALL_R);
      bg.addColorStop(0, "#fff"); bg.addColorStop(1, "#b9c6d8");
      ctx!.fillStyle = bg;
      ctx!.beginPath(); ctx!.arc(ball.x, ball.y, BALL_R, 0, 6.2832); ctx!.fill();
      ctx!.restore();

      // hud
      for (let i = 0; i < LIVES; i++) {
        ctx!.beginPath(); ctx!.arc(28 + i * 13, H - 12, 3.5, 0, 6.2832);
        if (i < lives) { ctx!.fillStyle = "#fff"; ctx!.fill(); } else { ctx!.strokeStyle = "rgba(255,255,255,.4)"; ctx!.lineWidth = 1; ctx!.stroke(); }
      }
      ctx!.font = `500 11px ${fam}`; ctx!.textBaseline = "middle"; ctx!.fillStyle = "rgba(255,255,255,.55)";
      if (!ball.live && ph !== "over") {
        ctx!.textAlign = "center";
        ctx!.fillText(ph === "ready" ? "Space or tap to launch" : "Tap to launch the next ball", W / 2, H * 0.6);
      }
    }

    function frame(now: number) {
      raf = 0;
      if (!visible || document.hidden) { running = false; return; }
      const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
      last = now; t += dt;
      acc += dt;
      const h = 1 / 180;
      while (acc >= h) { step(h); acc -= h; }
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || !visible || document.hidden) return;
      running = true; last = performance.now(); acc = 0;
      raf = requestAnimationFrame(frame);
    }

    const side = (e: PointerEvent): 0 | 1 => (e.clientX - c.getBoundingClientRect().left < W / 2 ? 0 : 1);
    const down = (e: PointerEvent) => {
      c.focus({ preventScroll: true });
      if (ph !== "over" && !ball.live) { launch(); return; }
      pointers.set(e.pointerId, side(e));
    };
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); };
    const kd = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { keys.l = true; e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { keys.r = true; e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { launch(); e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.l = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.r = false;
    };
    const blur = () => { keys.l = keys.r = false; pointers.clear(); };

    c.addEventListener("pointerdown", down);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", up);
    c.addEventListener("keydown", kd);
    c.addEventListener("keyup", ku);
    c.addEventListener("blur", blur);

    const ro = new ResizeObserver(size);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0.05 });
    io.observe(c);
    const vis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", vis);

    size();
    park();
    draw();
    api.current = { reset };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
      c.removeEventListener("pointerleave", up);
      c.removeEventListener("keydown", kd);
      c.removeEventListener("keyup", ku);
      c.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <>
      <b>{score}</b>
      <span>{best ? `Space pinball · best ${best}` : "Space pinball"}</span>
      <div className="game pin">
        <canvas
          ref={cv}
          tabIndex={0}
          role="application"
          aria-label="Space pinball. Use the left and right arrow keys to work the flippers and press space to launch the ball. On a touch screen, tap the left or right half of the table."
        />
        {phase === "over" && (
          <div className="over">
            <h4>Game over</h4>
            <p>{`You scored ${score}. Beat it?`}</p>
            <button type="button" className="btn" onClick={() => api.current?.reset()}>Play again</button>
          </div>
        )}
      </div>
    </>
  );
}
