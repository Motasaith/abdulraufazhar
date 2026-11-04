"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "@/lib/data";

export default function Featured() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reduce.current) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, i]);

  const go = useCallback((k: number) => setI((k + slides.length) % slides.length), []);
  const s = slides[i];

  return (
    <div
      className="feat"
      aria-roledescription="carousel"
      aria-label="Featured projects"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="feat-h">
        <div>
          <h2 className="H">{s.title}</h2>
          <a href={s.href} target="_blank" rel="noopener">
            {s.cta}{" "}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
        </div>
        <div className="ctr">
          <span>{`// 0${i + 1}`}</span>
          <div className="dots" role="tablist" aria-label="Choose project">
            {slides.map((sl, j) => (
              <button key={sl.href} type="button" role="tab" aria-current={j === i} aria-label={sl.title.split(" / ")[1]} onClick={() => go(j)} />
            ))}
          </div>
        </div>
      </div>
      <div className="stage">
        {slides.map((sl, j) => (
          <div className={`slide${j === i ? " on" : ""}`} key={sl.href} aria-hidden={j !== i}>
            <div className="screen">
              <i>
                <b />
              </i>
              <Image src={sl.img} alt={sl.alt} width={sl.w} height={sl.h} priority={j === 0} loading={j === 0 ? undefined : "lazy"} />
            </div>
            <div className="note">
              <b>How it works</b>
              {sl.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
