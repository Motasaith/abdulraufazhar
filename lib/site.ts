// Set NEXT_PUBLIC_SITE_URL in Cloudflare Pages (Settings > Environment variables)
// to your real domain. Canonical URLs, sitemap, Open Graph and JSON-LD all use it.
import { PROFILE } from "./profile";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://abdulrauf.pages.dev").replace(/\/$/, "");

export const SITE = {
  name: "Abdul Rauf Azhar",
  title: "Abdul Rauf Azhar | Full-Stack & AI Developer",
  description:
    "Full-stack and AI developer in Rahim Yar Khan, Pakistan. Six live products: browser games, AI video tools, calculators, support agents and more. Available for freelance projects.",
  email: PROFILE.email,
  github: PROFILE.github,
  linkedin: PROFILE.linkedin,
};
