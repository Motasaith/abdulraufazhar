"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/lib/data";

/* A tiny Breakout: the seven project tags are the bricks. Each takes 3 hits.
   Hit 1 cracks it, hit 2 tears it in two, hit 3 shatters it. */

type Style = "or" | "white" | "ink";
const BRICKS: { name: string; style: Style }[] = [
  { name: "PTA Game", style: "or" },
  { name: "Narrashot", style: "white" },
  { name: "PromptCut", style: "or" },
  { name: "Toolhive", style: "ink" },
  { name: "Home of Calculators", style: "white" },
  { name: "ChatGrain", style: "ink" },
  { name: "FileViewerHub", style: "or" },
];
const TH = { ink: "#161512", mute: "#67635b", card: "#ffffff", onInk: "#ffffff" };
const PAL: Record<Style, { fill: string; text: string; stroke: string | null; crack: string }> = {
  or: { fill: "#e8461e", text: "#ffffff", stroke: null, crack: "rgba(255,255,255,.85)" },
  white: { fill: "#ffffff", text: "#161512", stroke: "#161512", crack: "rgba(22,21,18,.7)" },
  ink: { fill: "#161512", text: "#ffffff", stroke: null, crack: "rgba(255,255,255,.75)" },
};
/* Pull the page theme into the canvas colours (the canvas cannot use CSS variables). */
function readTheme() {
  const s = getComputedStyle(document.documentElement);
  const g = (n: string, d: string) => s.getPropertyValue(n).trim() || d;
  TH.ink = g("--ink", "#161512");
  TH.mute = g("--mute", "#67635b");
  TH.card = g("--card", "#ffffff");
  TH.onInk = g("--on-ink", "#ffffff");
  PAL.white = { fill: TH.card, text: TH.ink, stroke: TH.ink, crack: TH.ink };
  PAL.ink = { fill: TH.ink, text: TH.onInk, stroke: null, crack: TH.onInk };
}

type Pt = { x: number; y: number };
type Brick = { name: string; style: Style; x: number; y: number; w: number; h: number; hp: number; hit: number; cracks: Pt[][]; zig: number[] };
type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: string; r: number; vr: number };
type Phase = "ready" | "play" | "won" | "lost";

const HP = 3, PAD_W = 70, PAD_H = 8, BALL_R = 5.5;

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

function makeCracks(seed: number) {
  const r = rng(seed * 9973 + 17);
  const cracks: Pt[][] = [];
  for (let i = 0; i < 5; i++) {
    const e = Math.floor(r() * 4);
    let p: Pt = e === 0 ? { x: r(), y: 0 } : e === 1 ? { x: r(), y: 1 } : e === 2 ? { x: 0, y: r() } : { x: 1, y: r() };
    const line = [p];
    for (let k = 0; k < 3; k++) {
      const dx = 0.5 - p.x, dy = 0.5 - p.y;
      p = { x: p.x + dx * 0.32 + (r() - 0.5) * 0.18, y: p.y + dy * 0.32 + (r() - 0.5) * 0.3 };
      line.push(p);
    }
    cracks.push(line);
  }
  const zig = Array.from({ length: 6 }, () => (r() - 0.5) * 0.2);
  return { cracks, zig };
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintBody(ctx: CanvasRenderingContext2D, b: Brick, dmg: number, font: string) {
  const P = PAL[b.style];
  rr(ctx, 0, 0, b.w, b.h, 8);
  ctx.fillStyle = P.fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = P.text;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.name, b.w / 2, b.h / 2 + 1);
  if (dmg >= 1) {
    ctx.strokeStyle = P.crack;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    const n = dmg === 1 ? 2 : b.cracks.length;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      b.cracks[i].forEach((p, k) => (k ? ctx.lineTo(p.x * b.w, p.y * b.h) : ctx.moveTo(p.x * b.w, p.y * b.h)));
      ctx.stroke();
    }
  }
  ctx.restore();
  if (P.stroke) {
    rr(ctx, 0.6, 0.6, b.w - 1.2, b.h - 1.2, 7.5);
    ctx.strokeStyle = P.stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, b: Brick, font: string, shake: boolean) {
  if (b.hp <= 0) return;
  const dmg = HP - b.hp;
  const ox = shake && b.hit > 0 ? (Math.random() - 0.5) * 3 : 0;
  const oy = shake && b.hit > 0 ? (Math.random() - 0.5) * 3 : 0;
  ctx.save();
  ctx.translate(b.x + ox, b.y + oy);
  if (dmg < 2) {
    paintBody(ctx, b, dmg, font);
  } else {
    const pts = b.zig.map((z, k) => ({ x: (0.5 + z) * b.w, y: (k / (b.zig.length - 1)) * b.h }));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(b.w / 2 + side * 2.2, b.h);
      ctx.rotate(side * 0.045);
      ctx.translate(-b.w / 2, -b.h);
      ctx.beginPath();
      const edge = side < 0 ? -20 : b.w + 20;
      ctx.moveTo(edge, -12);
      ctx.lineTo(pts[0].x, -12);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, b.h + 12);
      ctx.lineTo(edge, b.h + 12);
      ctx.closePath();
      ctx.clip();
      paintBody(ctx, b, dmg, font);
      ctx.restore();
    }
  }
  if (b.hit > 0) {
    ctx.globalAlpha = Math.min(0.55, b.hit * 6);
    rr(ctx, 0, 0, b.w, b.h, 8);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.restore();
}

export default function Breakout() {
  const cv = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ reset: () => void } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [broken, setBroken] = useState(0);

  useEffect(() => {
    const c = cv.current!;
    const ctx = c.getContext("2d")!;
    const fam = getComputedStyle(c).fontFamily;
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const font = `500 11.5px ${fam}`;
    const small = `500 11px ${fam}`;

    let W = 300, H = 300;
    const bricks: Brick[] = BRICKS.map((b, i) => {
      const { cracks, zig } = makeCracks(i + 1);
      return { name: b.name, style: b.style, x: 0, y: 0, w: 0, h: 34, hp: HP, hit: 0, cracks, zig };
    });
    const pad = { x: 0, y: 0, w: PAD_W };
    const ball = { x: 0, y: 0, vx: 0, vy: 0, stuck: true };
    let parts: Part[] = [];
    let lives = 3, hits = 0, ph: Phase = "ready";
    let left = false, right = false;
    let visible = false, running = false, dirty = true, raf = 0, last = 0;

    const setPh = (p: Phase) => { ph = p; setPhase(p); };
    const alive = () => bricks.filter((b) => b.hp > 0).length;

    function layout() {
      const m = W < 320 ? 16 : 24, gap = 8, bw = (W - 2 * m - gap) / 2;
      bricks.forEach((b, i) => {
        b.w = bw;
        const lone = i === bricks.length - 1 && i % 2 === 0; // odd one out sits centred
        b.x = lone ? (W - bw) / 2 : m + (i % 2) * (bw + gap);
        b.y = 10 + Math.floor(i / 2) * (b.h + gap);
      });
      pad.y = H - 32;
      pad.x = Math.min(Math.max(0, pad.x), W - pad.w);
      dirty = true;
    }
    function size() {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }
    function stick() {
      ball.stuck = true; ball.vx = 0; ball.vy = 0;
      ball.x = pad.x + pad.w / 2; ball.y = pad.y - BALL_R - 1;
    }
    const speed = () => Math.min(460, 300 + hits * 14);
    function setSpeed() {
      const s = speed(), m = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = (ball.vx / m) * s; ball.vy = (ball.vy / m) * s;
      if (Math.abs(ball.vy) < s * 0.28) ball.vy = Math.sign(ball.vy || -1) * s * 0.28;
    }
    function launch() {
      if (ph === "won" || ph === "lost" || !ball.stuck) return;
      const a = (Math.random() - 0.5) * 0.8, s = speed();
      ball.stuck = false; ball.vx = s * Math.sin(a); ball.vy = -s * Math.cos(a);
      if (ph === "ready") setPh("play");
    }
    function shatter(b: Brick) {
      const P = PAL[b.style];
      const n = reduce ? 6 : 22;
      for (let i = 0; i < n; i++) {
        parts.push({
          x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h,
          vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 220 - 20,
          life: 0, max: 0.55 + Math.random() * 0.4, s: 2 + Math.random() * 4,
          c: Math.random() < 0.7 ? P.fill : P.stroke ?? P.fill, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        });
      }
    }
    function reset() {
      bricks.forEach((b) => { b.hp = HP; b.hit = 0; });
      parts = []; lives = 3; hits = 0;
      setBroken(0); setPh("ready");
      stick(); dirty = true;
    }

    function stepBall(dt: number) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
      if (ball.y > H + BALL_R * 2) {
        lives--;
        if (lives <= 0) { setBroken(BRICKS.length - alive()); setPh("lost"); }
        stick();
        return;
      }
      // paddle
      if (ball.vy > 0 && ball.y + BALL_R >= pad.y && ball.y - BALL_R <= pad.y + PAD_H && ball.x >= pad.x - BALL_R && ball.x <= pad.x + pad.w + BALL_R) {
        const t = Math.max(-1, Math.min(1, (ball.x - (pad.x + pad.w / 2)) / (pad.w / 2)));
        const ang = t * 1.1, s = speed();
        ball.y = pad.y - BALL_R;
        ball.vx = s * Math.sin(ang); ball.vy = -s * Math.cos(ang);
      }
      // bricks
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
        const dx = ball.x - cx, dy = ball.y - cy;
        if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
        if (dx === 0 && dy === 0) ball.vy = -ball.vy;
        else if (Math.abs(dx) > Math.abs(dy)) { ball.vx = Math.sign(dx) * Math.abs(ball.vx); ball.x = cx + Math.sign(dx) * BALL_R; }
        else { ball.vy = Math.sign(dy) * Math.abs(ball.vy); ball.y = cy + Math.sign(dy) * BALL_R; }
        b.hp--; b.hit = 0.1; hits++;
        setSpeed();
        if (b.hp <= 0) {
          shatter(b);
          if (alive() === 0) { setBroken(BRICKS.length); setPh("won"); stick(); }
        }
        break;
      }
    }

    function update(dt: number) {
      const k = (right ? 1 : 0) - (left ? 1 : 0);
      if (k) { pad.x = Math.min(Math.max(0, pad.x + k * 460 * dt), W - pad.w); dirty = true; }
      bricks.forEach((b) => { if (b.hit > 0) b.hit = Math.max(0, b.hit - dt); });
      parts.forEach((p) => { p.life += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; });
      parts = parts.filter((p) => p.life < p.max);
      if (ph === "play") {
        if (ball.stuck) { ball.x = pad.x + pad.w / 2; ball.y = pad.y - BALL_R - 1; }
        else for (let i = 0; i < 3; i++) { if (!ball.stuck && ph === "play") stepBall(dt / 3); }
      } else if (ph === "ready") { ball.x = pad.x + pad.w / 2; ball.y = pad.y - BALL_R - 1; }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      bricks.forEach((b) => drawBrick(ctx, b, font, !reduce));
      parts.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7);
        ctx.restore();
      });
      // paddle + ball
      rr(ctx, pad.x, pad.y, pad.w, PAD_H, 4); ctx.fillStyle = TH.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#e8461e"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = TH.ink; ctx.stroke();
      // hud
      ctx.font = small; ctx.textBaseline = "middle"; ctx.fillStyle = TH.mute;
      ctx.textAlign = "right"; ctx.fillText(`${alive()}/${BRICKS.length} bricks`, W - 24, H - 10);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(28 + i * 13, H - 10, 3.5, 0, Math.PI * 2);
        if (i < lives) { ctx.fillStyle = TH.ink; ctx.fill(); } else { ctx.strokeStyle = TH.mute; ctx.lineWidth = 1; ctx.stroke(); }
      }
      if (ball.stuck && (ph === "ready" || ph === "play")) {
        ctx.fillStyle = TH.mute; ctx.textAlign = "center";
        ctx.fillText(ph === "ready" ? "Move, then click to launch" : "Click to launch", W / 2, pad.y - 26);
      }
    }

    function loop(t: number) {
      if (!visible) { running = false; return; }
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      update(dt);
      if (dirty || ph === "play" || parts.length || bricks.some((b) => b.hit > 0)) { draw(); dirty = false; }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    // input
    const px = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      pad.x = Math.min(Math.max(0, e.clientX - r.left - pad.w / 2), W - pad.w);
      dirty = true;
    };
    const onMove = (e: PointerEvent) => px(e);
    const onDown = (e: PointerEvent) => { px(e); launch(); };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft" || e.key === "a") { left = down; e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d") { right = down; e.preventDefault(); }
      else if (down && (e.key === " " || e.key === "Enter" || e.key === "ArrowUp")) { launch(); e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => { left = false; right = false; };

    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("keydown", kd);
    c.addEventListener("keyup", ku);
    c.addEventListener("blur", blur);

    const ro = new ResizeObserver(size);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0.05 });
    io.observe(c);
    document.fonts?.ready.then(() => { dirty = true; });
    readTheme();
    const mo = new MutationObserver(() => { readTheme(); dirty = true; });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    pad.x = 0;
    size();
    pad.x = (W - pad.w) / 2;
    stick();
    api.current = { reset };

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect(); io.disconnect(); mo.disconnect();
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("keydown", kd);
      c.removeEventListener("keyup", ku);
      c.removeEventListener("blur", blur);
    };
  }, []);

  const over = phase === "won" || phase === "lost";

  return (
    <>
      <div className="hint">{phase === "ready" ? <span>Mouse, touch or ← →</span> : null}</div>
      <div className="game">
        <canvas
          ref={cv}
          tabIndex={0}
          role="application"
          aria-label="Breakout game. Move the paddle with your mouse, finger or the arrow keys, and press space or click to launch the ball. Break all six project bricks."
        />
        {over && (
          <div className="over">
            <h4>{phase === "won" ? "Wall cleared!" : "Game over"}</h4>
            <p>{phase === "won" ? "You broke all seven. Now see them for real:" : `${broken} of 7 bricks down. Try again, or visit them:`}</p>
            <div className="links">
              {projects.map((p) => (
                <a key={p.name} href={p.href} target="_blank" rel="noopener">{p.name} ↗</a>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => api.current?.reset()}>Play again</button>
          </div>
        )}
      </div>
      {/* always-present links for screen readers and crawlers */}
      <nav className="sr-only" aria-label="Live products">
        {projects.map((p) => (
          <a key={p.name} href={p.href} target="_blank" rel="noopener">{p.name}</a>
        ))}
      </nav>
    </>
  );
}
