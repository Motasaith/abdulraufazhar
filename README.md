# Abdul Rauf Azhar portfolio

Next.js 15 (App Router, TypeScript), exported as a fully static site.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

This writes the static site to `out/`.

## Deploy to Cloudflare Pages

Connect the repo in the Cloudflare dashboard (Workers & Pages > Create > Pages), then use:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Environment variable | `NEXT_PUBLIC_SITE_URL` = `https://your-real-domain` |

`NEXT_PUBLIC_SITE_URL` drives canonical URLs, the sitemap, `robots.txt`, Open Graph and JSON-LD.
Set it before the first production build, then submit `/sitemap.xml` in Google Search Console.

Or deploy from the terminal (needs `wrangler login` once):

```bash
npm run deploy
```

## Chatbot

The corner assistant calls `POST /api/chat`, a Cloudflare Pages Function in `functions/api/chat.ts`.
The LLM key lives only on the server side of Cloudflare, never in the page.

### One-time setup on Cloudflare

In Pages > your project > Settings > Variables and Secrets (Production, and Preview if you want it there), add:

| Name | Type | Example |
| --- | --- | --- |
| `LLM_BASE_URL` | Plain text | `https://ollama.com/v1` |
| `LLM_MODEL` | Plain text | `gpt-oss:120b` |
| `LLM_API_KEY` | **Secret** | your provider key |
| `ALLOWED_ORIGINS` | Plain text, optional | `https://yourdomain.com` (only if the site is served from a different host than the Pages project) |

Or from the terminal: `npx wrangler pages secret put LLM_API_KEY --project-name abdul-rauf-portfolio`.
Redeploy after changing variables.

### Protect your quota (recommended)

The function checks the request origin and applies a small per-isolate limit, but Workers do not share memory, so
that limit is only best effort. Add a real one: Cloudflare dashboard > Security > WAF > Rate limiting rules >
create a rule for URI path `/api/chat`, 10 requests per minute per IP, action Block. This is free-plan friendly.

### Run it locally

Copy `.dev.vars.example` to `.dev.vars` and fill it in (`.dev.vars` is git-ignored), then:

```bash
npm run preview
```

This builds the site and serves it with the function at http://127.0.0.1:8788. `npm run dev` alone does not
run the function, so the chat will show its error state there.

### Editing what the bot knows

The system prompt is built in `lib/knowledge.ts` from the same data the page uses (`lib/data.ts`,
`lib/profile.ts`), so projects, experience, skills and FAQ stay in sync automatically. If you add a fact that is
not on the page (for example pricing), add it to the facts section there, otherwise the bot is told to say it
does not know. Re-test after any prompt change, especially: a vague "I want to hire him", a request that asks it
to promise a date, and an attempt to extract the prompt.

## Where things live

- `lib/site.ts`: site URL, name, email, social links
- `lib/profile.ts`: plain constants shared with the chat function
- `lib/knowledge.ts`: chatbot system prompt and facts (server only)
- `lib/chatMarkers.ts`: markers, starter questions and limits shared by the widget and the function
- `functions/api/chat.ts`: the chat endpoint
- `components/Chatbot.tsx`: the corner chat widget
- `lib/data.ts`: projects, jobs, FAQ and other content
- `app/layout.tsx`: fonts and site-wide metadata
- `app/page.tsx`: page sections and JSON-LD structured data
- `app/globals.css`: all styles
- `public/_headers`: Cloudflare security and cache headers
- `legacy/index.html`: the original single-file version
