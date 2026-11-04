/**
 * POST /api/chat
 *
 * Cloudflare Pages Function. The browser never sees the LLM key: it sends the
 * conversation here, this function adds the system prompt, calls the
 * OpenAI-compatible endpoint and streams plain text back.
 *
 * Secrets (Pages > Settings > Variables and Secrets, or `.dev.vars` locally):
 *   LLM_BASE_URL   e.g. https://ollama.com/v1
 *   LLM_API_KEY    the provider key (store as a Secret)
 *   LLM_MODEL      e.g. gpt-oss:120b
 *   ALLOWED_ORIGINS  optional, comma separated extra origins (custom domains)
 */
import { buildSystemPrompt } from "../../lib/knowledge";
import { CHAT_LIMITS, MARKERS } from "../../lib/chatMarkers";

interface Env {
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}
type Ctx = { request: Request; env: Env };
type Turn = { role: "user" | "assistant"; content: string };

const MAX_BODY_CHARS = 16_000;
const MAX_ASSISTANT_CHARS = 1_500;
const PER_MINUTE = 8;
const PER_HOUR = 60;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

/* Best-effort limiter. Workers isolates do not share memory, so this only stops
   a single client hammering one isolate. For a hard limit add a Cloudflare WAF
   rate limiting rule on /api/chat (see README). */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  const lastMinute = recent.filter((t) => now - t < 60_000).length;
  if (lastMinute >= PER_MINUTE || recent.length >= PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 3_600_000)) hits.delete(k);
  return false;
}

function originAllowed(req: Request, env: Env): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    if (o.host === new URL(req.url).host) return true;
    if (o.hostname === "localhost" || o.hostname === "127.0.0.1") return true;
    return (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(o.origin);
  } catch {
    return false;
  }
}

/** Keep only well-formed turns, bounded in size and count, ending on a user turn. */
function cleanTurns(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: Turn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const { role, content } = t as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const limit = role === "user" ? CHAT_LIMITS.maxCharsPerMessage : MAX_ASSISTANT_CHARS;
    const text = content.replace(/\u0000/g, "").trim().slice(0, limit);
    if (!text) continue;
    turns.push({ role, content: text });
  }
  let out = turns.slice(-CHAT_LIMITS.maxTurnsSent);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

/** House style: no em or en dashes in anything the bot says. */
const tidy = (s: string) => s.replace(/\s*[–—]\s*/g, " - ");

const FALLBACK = `Sorry, I could not put an answer together just now. Please try again, or email Abdul directly. ${MARKERS.email}`;

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (!originAllowed(request, env)) return json(403, { error: "forbidden" });

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (limited(ip)) return json(429, { error: "rate_limited" }, { "retry-after": "60" });

  if (!env.LLM_BASE_URL || !env.LLM_MODEL) return json(503, { error: "not_configured" });

  let payload: { messages?: unknown };
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) return json(413, { error: "too_large" });
    payload = JSON.parse(text);
  } catch {
    return json(400, { error: "bad_request" });
  }
  const turns = cleanTurns(payload.messages);
  if (!turns) return json(400, { error: "bad_request" });

  const model = env.LLM_MODEL;
  const body: Record<string, unknown> = {
    model,
    stream: true,
    temperature: 0.4,
    max_tokens: 900,
    messages: [{ role: "system", content: buildSystemPrompt(new Date().toISOString().slice(0, 10)) }, ...turns],
  };
  // gpt-oss spends tokens "thinking" before it answers; keep that short for latency.
  if (/gpt-oss/i.test(model)) body.reasoning_effort = "low";

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 45_000);

  let upstream: Response;
  try {
    upstream = await fetch(`${env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(env.LLM_API_KEY ? { authorization: `Bearer ${env.LLM_API_KEY}` } : {}) },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
  } catch {
    clearTimeout(timer);
    return json(502, { error: "upstream_unreachable" });
  }
  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    // The provider's error text can contain account details, so it is not forwarded.
    return json(502, { error: "upstream_error", status: upstream.status });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();
  const isSse = (upstream.headers.get("content-type") || "").includes("event-stream");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = 0;
      const emit = (s: string) => {
        const t = tidy(s);
        if (t) {
          sent += t.length;
          controller.enqueue(enc.encode(t));
        }
      };
      try {
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          if (!isSse) continue;
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string") emit(delta);
            } catch {
              /* ignore a malformed chunk */
            }
          }
        }
        if (!isSse) {
          try {
            const msg = JSON.parse(buf)?.choices?.[0]?.message?.content;
            if (typeof msg === "string") emit(msg);
          } catch {
            /* fall through to the fallback text */
          }
        }
        if (sent === 0) emit(FALLBACK);
      } catch {
        if (sent === 0) emit(FALLBACK);
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
    cancel() {
      clearTimeout(timer);
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
};

export const onRequest = async (): Promise<Response> => json(405, { error: "method_not_allowed" }, { allow: "POST" });
