"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Breakout from "@/components/Breakout";
import Pinball from "@/components/Pinball";

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

/* ---------- Section ---------- */

export default function Stats() {
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const n6 = useCountUp(7, r1);
  const n44 = useCountUp(44, r2);

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
      <div className="st dk rv">
        <Pinball />
      </div>
    </div>
  );
}
