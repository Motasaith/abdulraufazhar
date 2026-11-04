export type Project = {
  name: string;
  href: string;
  img: string;
  cap: string;
  tags: string[];
  w: number;
  h: number;
};

export const projects: Project[] = [
  { name: "PTA Game", href: "https://ptagames.dpdns.org/", img: "/img/pta-game.webp", w: 1000, h: 471, cap: "A GTA-style open world set in a Pakistani city, generated in your browser.", tags: ["three.js", "Procedural city", "Cloudflare"] },
  { name: "Narrashot", href: "https://narrashot.dpdns.org/", img: "/img/narrashot.webp", w: 1000, h: 532, cap: "Screenshots in, narrated tutorial video out. No screen recorder, no retakes.", tags: ["Next.js", "FastAPI", "FFmpeg"] },
  { name: "PromptCut", href: "https://promptcut.dpdns.org/", img: "/img/promptcut.webp", w: 1000, h: 620, cap: "Say it, watch it move. Turn a script into a finished explainer video with voice, drawings and captions.", tags: ["AI video", "Voice and captions", "Web, Windows, Android"] },
  { name: "Home of Calculators", href: "https://homeofcalculators.com/", img: "/img/home-of-calculators.webp", w: 1000, h: 501, cap: "500+ calculators, an AI photo solver and a builder to make your own.", tags: ["Next.js 15", "AI solver", "Cloudflare Pages"] },
  { name: "Toolhive", href: "https://toolhive.me", img: "/img/toolhive.webp", w: 1000, h: 495, cap: "44+ creative and developer tools that never upload your files.", tags: ["React", "WebAssembly", "Client-side"] },
  { name: "ChatGrain", href: "https://chatgrain.com", img: "/img/chatgrain.webp", w: 1000, h: 529, cap: "A support agent built from your own website that says \"I don't know\" when it should.", tags: ["AI agents", "Retrieval", "Citations"] },
  { name: "FileViewerHub", href: "https://fileviewerhub.com", img: "/img/fileviewerhub.webp", w: 1000, h: 499, cap: "Open email, database, map, 3D and document files in the browser. I maintain it.", tags: ["GitHub Actions", "PM2", "Nginx"] },
];

export const slides = [
  { title: "Browser game / PTA Game", href: "https://ptagames.dpdns.org/", cta: "Play it", img: "/img/pta-game.webp", alt: "PTA Game title screen", w: 1000, h: 471, note: "The whole city is generated in your browser when it loads. No art files, no server." },
  { title: "AI video / Narrashot", href: "https://narrashot.dpdns.org/", cta: "Make a video", img: "/img/narrashot.webp", alt: "Narrashot upload screen", w: 1000, h: 532, note: "Drop in up to 50 screenshots. It writes the narration, zooms in and renders an MP4." },
  { title: "Calculators / Home of Calculators", href: "https://homeofcalculators.com/", cta: "Open it", img: "/img/home-of-calculators.webp", alt: "Home of Calculators home page", w: 1000, h: 501, note: "500+ calculators, plus an AI solver that reads a maths problem from a photo." },
];

export const capabilities = [
  { title: "Web apps", text: "Next.js, FastAPI, Postgres, logins and payments.", href: "https://homeofcalculators.com/", img: "/img/home-of-calculators.webp", w: 1000, h: 501 },
  { title: "AI agents & MCP", text: "Agents on your data and MCP servers for your APIs.", href: "https://chatgrain.com", img: "/img/chatgrain.webp", w: 1000, h: 529 },
  { title: "Video pipelines", text: "FFmpeg rendering, AI narration, timeline editing.", href: "https://narrashot.dpdns.org/", img: "/img/narrashot.webp", w: 1000, h: 532 },
  { title: "AI studios", text: "Prompt-to-video tools with voice, drawings and captions.", href: "https://promptcut.dpdns.org/", img: "/img/promptcut.webp", w: 1000, h: 620 },
  { title: "3D & games", text: "three.js, WebGL shaders and landing pages.", href: "https://ptagames.dpdns.org/", img: "/img/pta-game.webp", w: 1000, h: 471 },
];

export const jobs = [
  { yr: "Sept 2026 → now", title: "Full-Stack Developer, AI & Automation", at: "Wise Technologies · joined after interning", bullets: ["Built and deployed an MCP server for the company's image-upscaling API.", "Designed the company website redesign, including a custom GLSL shader hero."] },
  { yr: "2025 → now", title: "Freelance Full-Stack Developer", at: "Remote", bullets: ["Delivered a UK e-commerce store with Next.js, Clerk and Stripe.", "Built a landing page for a Lahore real estate client."] },
  { yr: "Expected 2027", title: "BS Data Science & AI", at: "KFUEIT", bullets: ["Built a cardiovascular-risk ML model at Hack4Health."] },
];

export const stack = [
  ["Front end", "Next.js, React, TypeScript, three.js, GSAP, WebGL / GLSL"],
  ["Back end & data", "Python, FastAPI, Node.js, PostgreSQL, Supabase, Drizzle"],
  ["AI & media", "MCP, LLM APIs, Ollama, FFmpeg"],
  ["Ship & run", "Cloudflare, Vercel, Docker, Nginx, GitHub Actions"],
];

export const faqs = [
  { q: "Are you taking freelance work?", a: "Yes, a few projects at a time. I work full time at Wise Technologies, so I keep my freelance list short and give each one proper attention." },
  { q: "What do you usually build with?", a: "Next.js and React on the front end, FastAPI or Node on the back end, Postgres or Supabase for data, and LLM APIs or MCP for the AI layer." },
  { q: "Do you work with clients outside Pakistan?", a: "Yes. I've delivered an e-commerce store for a UK client. I'm on UTC+5 and share working builds as I go." },
  { q: "Will you look after it after launch?", a: "Yes. Deployment, monitoring and fixes are part of the job. I still maintain FileViewerHub, for example." },
];

export const navLinks = [
  { href: "#top", label: "Home" },
  { href: "#work", label: "Work" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

// Shown in the "In the works" section (markup lives in app/page.tsx). Kept here
// so the chatbot's knowledge stays in step with the page. Update both together.
export const inTheWorks = [
  { name: "M A Store (Mobizo)", status: "in development for a client", href: "https://m-a-store.pages.dev/", text: "A mobile accessories store for a client: cases, chargers, tempered glass and parts, with cash on delivery across Pakistan." },
  { name: "AsaanTax PK", status: "in development", text: "Tax filing for Pakistani taxpayers (FBR), AI-assisted, built with a chartered accountant. Stack: Next.js and Drizzle." },
];
