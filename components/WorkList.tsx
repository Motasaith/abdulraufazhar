"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { projects } from "@/lib/data";

export default function WorkList() {
  const [shown, setShown] = useState(0); // what the preview displays
  const [active, setActive] = useState(0); // highlighted row
  const [fade, setFade] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function pick(k: number) {
    if (k === active) return;
    setActive(k);
    setFade(true);
    if (timer.current) clearTimeout(timer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    timer.current = setTimeout(() => {
      setShown(k);
      setFade(false);
    }, reduce ? 0 : 180);
  }

  const p = projects[shown];

  return (
    <div className="wgrid">
      <div className="cases rv">
        {projects.map((c, k) => (
          <a
            key={c.name}
            className={`case${k === active ? " on" : ""}`}
            href={c.href}
            target="_blank"
            rel="noopener"
            onMouseEnter={() => pick(k)}
            onFocus={() => pick(k)}
          >
            <h3 className="H">{c.name}</h3>
            <ul>
              {c.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </a>
        ))}
      </div>
      <div className="preview rv" aria-hidden="true">
        <div className="pv">
          <Image src={p.img} alt="" width={p.w} height={p.h} style={{ opacity: fade ? 0 : 1 }} />
        </div>
        <div className="pcap">
          <b>{p.name}</b>
          <span>{p.cap}</span>
        </div>
      </div>
    </div>
  );
}
