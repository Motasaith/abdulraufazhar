"use client";

import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CHAT_LIMITS, MARKERS, SUGGESTED_QUESTIONS } from "@/lib/chatMarkers";
import { PROFILE } from "@/lib/profile";

const ENDPOINT = process.env.NEXT_PUBLIC_CHAT_ENDPOINT || "/api/chat";
const STORE = "ar-chat-v1";
const LABEL_KEY = "ar-chat-label";
const MAX_USER_MESSAGES = 40;

const GREETING = "Hi, I'm Abdul's assistant. I can walk you through his projects, skills and availability. What are you curious about?";

type Msg = {
  id: number;
  role: "user" | "assistant";
  raw: string; // assistant text exactly as streamed, markers included
  streaming?: boolean;
  error?: "rate" | "fail";
  retry?: string;
};

/* ---------- reply parsing ---------- */

const CLAIM = /\b(?:i|we)(?:'ve|’ve| have|'ll|’ll| will)\s+(?:just\s+|already\s+)?(?:sent|forwarded|emailed|notified|passed|relayed|escalated|contacted|messaged|booked|scheduled)\b|\b(?:abdul|someone|the team)\s+will\s+(?:get back|contact|reach out|reply|respond)\b/i;

function parse(raw: string, streaming: boolean) {
  let email = raw.includes(MARKERS.email);
  const off = raw.includes(MARKERS.offTopic);
  let t = raw.split(MARKERS.email).join("").split(MARKERS.offTopic).join("");
  if (streaming) {
    // hide a half-typed marker or link until it completes
    t = t.replace(/\s*\[{1,2}[A-Z_]*\]?\]?$/, "").replace(/\[[^\]]*\]\([^)]*$/, "").replace(/\[[^\]]*$/, "");
  } else {
    // The assistant cannot contact anyone. If it claims it did, drop that sentence
    // and offer the real email button instead.
    const kept = t.split(/(?<=[.!?])\s+/).filter((s) => {
      if (CLAIM.test(s)) { email = true; return false; }
      return true;
    });
    t = kept.join(" ");
  }
  return { text: t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(), email, off: off && !email };
}

/* ---------- tiny safe markdown (React nodes only, never innerHTML) ---------- */

type Run = { kind: "p" | "ul" | "ol"; items: string[] };

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

function inline(text: string, key = ""): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={k}>{inline(part.slice(2, -2), k)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={k}>{part.slice(1, -1)}</code>;
    const m = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (m) return <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  text.split(/\n{2,}/).forEach((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim());
    let run: Run | null = null;
    const runs: Run[] = [];
    for (const line of lines) {
      const kind = /^\s*[-*•]\s+/.test(line) ? "ul" : /^\s*\d+[.)]\s+/.test(line) ? "ol" : "p";
      const body = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "");
      if (run && run.kind === kind && kind !== "p") run.items.push(body);
      else if (run && run.kind === "p" && kind === "p") run.items.push(line);
      else { run = { kind, items: [kind === "p" ? line : body] }; runs.push(run); }
    }
    runs.forEach((r, ri) => {
      const k = `${bi}-${ri}`;
      if (r.kind === "p") blocks.push(<p key={k}>{r.items.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l, `${k}-${i}`)}</Fragment>)}</p>);
      else if (r.kind === "ul") blocks.push(<ul key={k}>{r.items.map((l, i) => <li key={i}>{inline(l, `${k}-${i}`)}</li>)}</ul>);
      else blocks.push(<ol key={k}>{r.items.map((l, i) => <li key={i}>{inline(l, `${k}-${i}`)}</li>)}</ol>);
    });
  });
  return <>{blocks}</>;
}

/* ---------- icons ---------- */

const I = {
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" /></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>,
};

/* ---------- component ---------- */

function Chips({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  return (
    <div className="cb-chips" role="group" aria-label="Suggested questions">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button key={q} type="button" onClick={() => onPick(q)} disabled={disabled}>{q}</button>
      ))}
    </div>
  );
}

function Avatar() {
  return (
    <span className="cb-av" aria-hidden="true">
      <Image src="/img/portrait.webp" alt="" width={56} height={56} />
    </span>
  );
}

let nextId = 1;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const msgsRef = useRef<Msg[]>([]);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);
  const stickRef = useRef(true);
  msgsRef.current = msgs;

  // restore this tab's conversation, and show the launcher label once
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "[]") as Msg[];
      if (Array.isArray(saved) && saved.length) {
        nextId = Math.max(...saved.map((m) => m.id)) + 1;
        setMsgs(saved.map((m) => ({ ...m, streaming: false })));
      }
    } catch { /* ignore corrupt storage */ }
    if (!sessionStorage.getItem(LABEL_KEY)) {
      const t = setTimeout(() => setShowLabel(true), 3500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (busy) return;
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-60))); } catch { /* storage full or blocked */ }
  }, [msgs, busy]);

  // flip the ring to light text while it floats over a dark section
  useEffect(() => {
    const check = () => {
      const y = window.innerHeight - 59; // vertical centre of the launcher
      const dark = Array.from(document.querySelectorAll(".dark")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      setOnDark(dark); // no-op when unchanged
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const dismissLabel = useCallback(() => {
    setShowLabel(false);
    try { sessionStorage.setItem(LABEL_KEY, "1"); } catch { /* ignore */ }
  }, []);

  // keep the newest message in view unless the visitor scrolled up to read
  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    if (open) {
      dismissLabel();
      const t = setTimeout(() => taRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, dismissLabel]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`;
  }, [input, open]);

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => launchRef.current?.focus(), 0);
  }, []);

  const patch = (id: number, p: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const send = useCallback(async (text: string) => {
    const q = text.trim().slice(0, CHAT_LIMITS.maxCharsPerMessage);
    if (!q || busyRef.current) return;

    const prior = msgsRef.current.filter((m) => !m.error && (m.role === "user" || m.raw));
    if (prior.filter((m) => m.role === "user").length >= MAX_USER_MESSAGES) {
      setMsgs((m) => [...m, { id: nextId++, role: "assistant", raw: `We've covered a lot. For anything further, email Abdul directly. ${MARKERS.email}` }]);
      return;
    }

    const history = [...prior, { id: 0, role: "user" as const, raw: q }].map((m) => ({
      role: m.role,
      content: m.role === "assistant" ? parse(m.raw, false).text : m.raw,
    }));

    const aid = nextId++;
    setMsgs((m) => [...m, { id: nextId++, role: "user", raw: q }, { id: aid, role: "assistant", raw: "", streaming: true }]);
    setInput("");
    stickRef.current = true;
    busyRef.current = true;
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let raw = "";
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        patch(aid, { raw: "", streaming: false, error: res.status === 429 ? "rate" : "fail", retry: q });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        patch(aid, { raw });
      }
      patch(aid, { raw, streaming: false });
    } catch {
      // Stopped by the visitor: keep what arrived. Anything else: show the error state.
      if (ctrl.signal.aborted && raw) patch(aid, { raw, streaming: false });
      else if (ctrl.signal.aborted) setMsgs((m) => m.filter((x) => x.id !== aid));
      else patch(aid, { raw, streaming: false, error: "fail", retry: q });
    } finally {
      busyRef.current = false;
      setBusy(false);
      abortRef.current = null;
    }
  }, []);

  const retry = (id: number, q: string) => {
    if (busyRef.current) return;
    // drop the failed answer and the question that produced it, then ask again
    setMsgs((m) => {
      const i = m.findIndex((x) => x.id === id);
      return i > 0 ? m.filter((_, j) => j !== i && j !== i - 1) : m;
    });
    setTimeout(() => send(q), 0);
  };

  const reset = () => {
    abortRef.current?.abort();
    setMsgs([]);
    setInput("");
    try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
    taRef.current?.focus();
  };

  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.raw || "";
  const mailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent("Portfolio enquiry")}&body=${encodeURIComponent(
    `Hi Abdul,\n\nI found your portfolio and would like to talk.${lastUser ? `\n\nWhat I'm after: ${lastUser.slice(0, 300)}` : ""}\n\nThanks,`,
  )}`;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="cb">
      {open && (
        <section className="cb-panel" role="dialog" aria-label="Chat with Abdul's assistant" onKeyDown={(e) => e.key === "Escape" && close()}>
          <header className="cb-head">
            <Avatar />
            <div className="cb-title">
              <b>Abdul&apos;s assistant</b>
              <span><i aria-hidden="true" />AI, answers from this portfolio</span>
            </div>
            <button type="button" className="cb-ic" onClick={reset} aria-label="Start a new chat" title="New chat" disabled={!msgs.length}>{I.reset}</button>
            <button type="button" className="cb-ic" onClick={close} aria-label="Close chat" title="Close">{I.close}</button>
          </header>

          <div
            className="cb-body"
            ref={bodyRef}
            role="log"
            aria-live="polite"
            onScroll={(e) => {
              const el = e.currentTarget;
              stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            <div className="cb-row a">
              <Avatar />
              <div className="cb-bub a"><p>{GREETING}</p></div>
            </div>
            {!msgs.length && <Chips onPick={send} disabled={busy} />}

            {msgs.map((m, idx) => {
              if (m.role === "user") {
                return (
                  <div className="cb-row u" key={m.id}>
                    <div className="cb-bub u"><p>{m.raw}</p></div>
                  </div>
                );
              }
              if (m.error) {
                return (
                  <div className="cb-row a" key={m.id}>
                    <Avatar />
                    <div className="cb-bub a err">
                      <p>{m.error === "rate" ? "You're sending messages a little fast. Give it a minute and try again." : "I couldn't reach my brain just now. That's on my side, not yours."}</p>
                      <div className="cb-acts">
                        {m.retry && <button type="button" className="cb-btn ghost" onClick={() => retry(m.id, m.retry!)} disabled={busy}>Try again</button>}
                        <a className="cb-btn" href={mailto}>{I.mail}Email Abdul</a>
                      </div>
                    </div>
                  </div>
                );
              }
              const p = parse(m.raw, !!m.streaming);
              const last = idx === msgs.length - 1;
              return (
                <div className="cb-row a" key={m.id}>
                  <Avatar />
                  <div className="cb-stack">
                    <div className="cb-bub a">
                      {p.text ? <Markdown text={p.text} /> : <span className="cb-dots" aria-label="Typing"><i /><i /><i /></span>}
                      {m.streaming && p.text && <span className="cb-caret" aria-hidden="true" />}
                    </div>
                    {!m.streaming && p.email && (
                      <div className="cb-card">
                        <span>Best way to reach Abdul</span>
                        <div className="cb-acts">
                          <a className="cb-btn" href={mailto}>{I.mail}Email Abdul</a>
                          <a className="cb-btn ghost" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                        </div>
                      </div>
                    )}
                    {!m.streaming && p.off && last && <Chips onPick={send} disabled={busy} />}
                  </div>
                </div>
              );
            })}
          </div>

          <form className="cb-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <div className="cb-field">
              <textarea
                ref={taRef}
                value={input}
                rows={1}
                maxLength={CHAT_LIMITS.maxCharsPerMessage}
                placeholder="Ask about projects, stack, availability"
                aria-label="Your message"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
              />
              {busy ? (
                <button type="button" className="cb-send stop" onClick={() => abortRef.current?.abort()} aria-label="Stop generating">{I.stop}</button>
              ) : (
                <button type="submit" className="cb-send" disabled={!input.trim()} aria-label="Send message">{I.send}</button>
              )}
            </div>
            <p className="cb-note">
              AI can get things wrong. For anything important, <a href={mailto}>email Abdul</a>.
              {input.length > CHAT_LIMITS.maxCharsPerMessage - 100 && <span> {CHAT_LIMITS.maxCharsPerMessage - input.length} left</span>}
            </p>
          </form>
        </section>
      )}

      <div className={`cb-launch${open ? " is-open" : ""}`}>
        {showLabel && !open && (
          // Decorative: the button's own aria-label already says what it does.
          <svg className={`cb-ring${onDark ? " on-dark" : ""}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <defs>
              <path id="cb-circ" d="M13,60 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
            </defs>
            <text>
              <textPath href="#cb-circ" textLength="291" lengthAdjust="spacing">
                ASK ABOUT ABDUL&apos;S WORK <tspan className="dot">&#9679;</tspan> AI ASSISTANT <tspan className="dot">&#9679;</tspan>{" "}
              </textPath>
            </text>
          </svg>
        )}
        <button
          ref={launchRef}
          type="button"
          className="cb-fab"
          onClick={() => (open ? close() : setOpen(true))}
          aria-label={open ? "Close chat" : "Open chat with Abdul's assistant"}
          aria-expanded={open}
        >
          <span className="cb-fab-i">{open ? I.close : I.chat}</span>
          {!open && <span className="cb-ping" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
