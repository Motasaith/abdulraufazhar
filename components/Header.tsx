"use client";

import { useEffect, useState } from "react";
import { navLinks } from "@/lib/data";
import { SITE } from "@/lib/site";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
  </svg>
);

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  function flip() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ar-theme", next); } catch {}
    setDark(!dark);
  }
  return (
    <button className="theme" type="button" onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const targets = navLinks.map((l) => document.getElementById(l.href.slice(1)));
    const spy = () => {
      setStuck(window.scrollY > 8);
      let k = 0;
      const y = window.scrollY + 140;
      targets.forEach((t, j) => {
        if (t && t.getBoundingClientRect().top + window.scrollY <= y) k = j;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) k = targets.length - 1;
      setCur(k);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", spy);
      window.removeEventListener("resize", spy);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <header className={`nav${stuck ? " stuck" : ""}`} id="nav">
      <div className="wrap">
        <div className="bar">
          <a className="brand" href="#top" aria-label="Abdul Rauf Azhar, back to top">
            <span className="mark">AR</span>
            <span className="who">
              <b>{SITE.name}</b>
              <span>Full-Stack &amp; AI Developer</span>
            </span>
          </a>
          <nav className="menu" aria-label="Sections">
            {navLinks.map((l, i) => (
              <a key={l.href} href={l.href} className={i === cur ? "cur" : undefined} aria-current={i === cur ? "true" : undefined}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav-r">
            <ThemeToggle />
            <a className="btn live" href={`mailto:${SITE.email}`} title="Available for projects">
              <MailIcon />
              Email me
            </a>
            <button
              className="burger"
              type="button"
              aria-expanded={open}
              aria-controls="sheet"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span />
            </button>
          </div>
          <nav className={`sheet${open ? " open" : ""}`} id="sheet" aria-label="Sections (mobile)" onClick={(e) => (e.target as HTMLElement).tagName === "A" && setOpen(false)}>
            {navLinks.map((l, i) => (
              <a key={l.href} href={l.href} className={i === cur ? "cur" : undefined}>
                {l.label}
              </a>
            ))}
            <span className="avail">Available for projects</span>
          </nav>
        </div>
      </div>
    </header>
  );
}
