"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Breakout from "@/components/Breakout";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

/* Counts 0 -> target the first time the element scrolls into view. Server HTML keeps the real number. */
function useCountUp(target: number, ref: RefObject<HTMLElement | null>) {
  const [n, setN] = useState(target);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !("IntersectionObserver" in window)) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, ref]);
  return n;
}

/* ---------- Card 2: ask Toolhive ---------- */

const QA = [
  { chip: "Photo upload?", q: "Does it upload my photo to compress it?", a: "No. All 44+ tools run inside your browser. Your files never leave your device." },
  { chip: "Is it free?", q: "Is it free to use?", a: "Yes. Toolhive is live and free to try." },
  { chip: "Built with?", q: "What is it built with?", a: "React and WebAssembly, running client-side, so the heavy work happens on your device." },
  { chip: "What's inside?", q: "What kind of tools are in it?", a: "44+ creative and developer tools, all in one place." },
];

function Chat() {
  const [qi, setQi] = useState(0);
  const [shown, setShown] = useState(QA[0].a.length);
  const [thinking, setThinking] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const full = QA[qi].a.length;
    if (reduced()) { setThinking(false); setShown(full); return; }
    setShown(0);
    setThinking(true);
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      setThinking(false);
      iv = setInterval(() => setShown((n) => { if (n + 2 >= full) { clearInterval(iv); return full; } return n + 2; }), 22);
    }, 480);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [qi]);

  const cur = QA[qi];
  return (
    <>
      <div className="chat" aria-live="polite">
        <div className="q"><i>?</i>{cur.q}</div>
        <div className="a">
          <small>Toolhive</small>
          <div className="ans">
            <span className="ghost">{cur.a}</span>
            <span className="live">{thinking ? <span className="td" aria-label="Typing"><span /><span /><span /></span> : cur.a.slice(0, shown)}</span>
          </div>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Ask Toolhive a question">
        {QA.map((x, i) => (
          <button key={x.chip} type="button" aria-pressed={i === qi} onClick={() => setQi(i)}>{x.chip}</button>
        ))}
      </div>
    </>
  );
}

/* ---------- Card 3: draggable gauge ---------- */

const MAX = 500, CX = 125, CY = 130, R = 105, NEEDLE = 88;

function Gauge({ auto }: { auto: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const [g, setG] = useState<number | null>(null);
  const dragging = useRef(false);
  const val = g ?? auto;

  const fromPointer = (e: RPointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const k = 250 / r.width;
    const dx = (e.clientX - r.left) * k - CX;
    const dy = Math.max(0, CY - (e.clientY - r.top) * k);
    setG(Math.round(MAX * (1 - Math.atan2(dy, dx) / Math.PI)));
  };
  const th = Math.PI * (1 - val / MAX);
  const tx = CX + R * Math.cos(th), ty = CY - R * Math.sin(th);
  const nx = CX + NEEDLE * Math.cos(th), ny = CY - NEEDLE * Math.sin(th);

  return (
    <>
      <div className="gread">
        <div><b>{Math.round(val)}</b> / 500+</div>
        <small>{g === null ? "Drag the needle" : "calculators, and counting"}</small>
      </div>
      <svg
        ref={svg}
        className="gauge"
        viewBox="0 0 250 140"
        role="slider"
        tabIndex={0}
        aria-label="Number of calculators"
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={Math.round(val)}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.classList.add("mouse"); e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onBlur={(e) => e.currentTarget.classList.remove("mouse")}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={(e) => {
          e.currentTarget.classList.remove("mouse");
          const step = e.shiftKey ? 50 : 10;
          const k: Record<string, number> = { ArrowRight: val + step, ArrowUp: val + step, ArrowLeft: val - step, ArrowDown: val - step, Home: 0, End: MAX };
          if (e.key in k) { e.preventDefault(); setG(Math.max(0, Math.min(MAX, k[e.key]))); }
        }}
      >
        <path d="M20 130a105 105 0 0 1 210 0" fill="none" style={{ stroke: "var(--line2)" }} strokeWidth="16" strokeLinecap="round" />
        <path d={`M20 130A105 105 0 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)}`} fill="none" stroke="#e8461e" strokeWidth="16" strokeLinecap="round" />
        <g style={{ stroke: "var(--mute)" }} strokeWidth="1.5"><path d="M40 130h-8M125 46v-8M210 130h8M65 70l-6-6M185 70l6-6" /></g>
        <line x1={CX} y1={CY} x2={nx} y2={ny} style={{ stroke: "var(--ink)" }} strokeWidth="3" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="7" style={{ fill: "var(--ink)" }} />
        <circle cx={nx} cy={ny} r="11" fill="transparent" />
        <text x="22" y="118">0</text><text x="113" y="62">250</text><text x="200" y="118">500</text>
      </svg>
    </>
  );
}

/* ---------- Section ---------- */

export default function Stats() {
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const r3 = useRef<HTMLDivElement>(null);
  const n6 = useCountUp(7, r1);
  const n44 = useCountUp(44, r2);
  const n500 = useCountUp(500, r3);

  return (
    <div className="stats">
      <div className="st rv" ref={r1}>
        <b>{n6}</b>
        <span>Live products</span>
        <Breakout />
      </div>
      <div className="st dk rv" ref={r2}>
        <b>{n44}+</b>
        <span>Browser tools in Toolhive</span>
        <Chat />
      </div>
      <div className="st rv" ref={r3}>
        <b>{n500}+</b>
        <span>Calculators on Home of Calculators</span>
        <Gauge auto={n500} />
      </div>
    </div>
  );
}
