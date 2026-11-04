import Image from "next/image";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Featured from "@/components/Featured";
import WorkList from "@/components/WorkList";
import Reveal from "@/components/Reveal";
import Stats from "@/components/Stats";
import { capabilities, faqs, jobs, projects, stack } from "@/lib/data";
import { SITE, SITE_URL } from "@/lib/site";

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, "aria-hidden": true } as const;

function SectionHead({ id, title, note, icon }: { id: string; title: string; note: string; icon: ReactNode }) {
  return (
    <div className="sh rule rv">
      <div className="sh-t">
        <span>
          <svg {...svg}>{icon}</svg>
        </span>
        <h2 className="H" id={id}>
          {title}
        </h2>
      </div>
      <p>{note}</p>
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE.name,
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/img/portrait.webp`,
      email: `mailto:${SITE.email}`,
      jobTitle: "Full-Stack & AI Developer",
      description: SITE.description,
      address: { "@type": "PostalAddress", addressLocality: "Rahim Yar Khan", addressCountry: "PK" },
      worksFor: { "@type": "Organization", name: "Wise Technologies" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "KFUEIT" },
      sameAs: [SITE.github, SITE.linkedin],
      knowsAbout: ["Next.js", "React", "TypeScript", "FastAPI", "Python", "MCP", "three.js", "FFmpeg", "LLM applications"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/#profile`,
      url: `${SITE_URL}/`,
      name: SITE.title,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "ItemList",
      name: "Live products by Abdul Rauf Azhar",
      itemListElement: projects.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "WebApplication", name: p.name, url: p.href, description: p.cap, author: { "@id": `${SITE_URL}/#person` } },
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <Reveal />

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <div className="hero-top rule">
              <div className="face">
                <Image src="/img/portrait.webp" alt="Abdul Rauf Azhar" width={400} height={400} priority />
              </div>
              <div className="hello">
                <small>I&apos;m</small>
                <h1 className="H">Abdul Rauf</h1>
              </div>
              <p>A full-stack &amp; AI developer from Rahim Yar Khan, Pakistan. I make things people can open in a browser and use.</p>
            </div>
            <Featured />
          </div>
        </section>

        <section className="sec" aria-labelledby="stats-h">
          <div className="wrap">
            <SectionHead id="stats-h" title="Stats" note="A few numbers from the things I've built and still look after." icon={<path d="M5 20V11M12 20V4M19 20v-6" />} />
            <Stats />
          </div>
        </section>

        <section className="sec dark" id="work" aria-labelledby="work-h">
          <div className="wrap">
            <SectionHead id="work-h" title="Work" note="Everything here is live and free to try." icon={<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4h8v2" /></>} />
            <WorkList />
          </div>
        </section>

        <section className="sec" id="capabilities" aria-labelledby="cap-h">
          <div className="wrap">
            <SectionHead id="cap-h" title="Capabilities" note="What I can build for you, from the database up to the deployed link." icon={<path d="m8 7-5 5 5 5M16 7l5 5-5 5" />} />
            <div className="caps">
              {capabilities.map((c) => (
                <div className="cap rv" key={c.title}>
                  <div className="im"><Image src={c.img} alt="" width={c.w} height={c.h} loading="lazy" /></div>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec dark" aria-labelledby="next-h">
          <div className="wrap">
            <SectionHead id="next-h" title="In the works" note="What I'm building next. Not public yet." icon={<><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="9" /></>} />
            <div className="works">
              <div className="wk rv">
                <div className="im">
                  <div className="tax">
                    <div className="H">AsaanTax<br />PK</div>
                    <ol>
                      <li><span>FBR tax filing</span><span>AI-assisted</span></li>
                      <li><span>Built with</span><span>a chartered accountant</span></li>
                      <li><span>Stack</span><span>Next.js &middot; Drizzle</span></li>
                    </ol>
                  </div>
                </div>
                <div className="tx"><b>AsaanTax PK</b>Tax filing for Pakistani taxpayers, without the paperwork headache. <em>In development.</em></div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="experience" aria-labelledby="exp-h">
          <div className="wrap">
            <SectionHead id="exp-h" title="Experience" note="Where I've worked and what I'm studying." icon={<path d="M4 7h16v12H4zM9 7V5h6v2" />} />
            <div className="exp">
              {jobs.map((j) => (
                <div className="job rv" key={j.title}>
                  <span className="yr">{j.yr}</span>
                  <h3>{j.title}</h3>
                  <span className="at">{j.at}</span>
                  <ul>{j.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
            <dl className="stack rv">
              {stack.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="sec" aria-labelledby="faq-h" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <SectionHead id="faq-h" title="FAQ" note="Answers to what people usually ask before they email." icon={<><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01" /><circle cx="12" cy="12" r="9" /></>} />
            <div className="faq rv">
              {faqs.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="ct-h" id="contact">
          <div className="wrap">
            <div className="cta rv">
              <Image className="side s1" src="/img/toolhive.webp" alt="" width={1000} height={495} loading="lazy" />
              <Image className="side s2" src="/img/fileviewerhub.webp" alt="" width={1000} height={499} loading="lazy" />
              <h2 className="H" id="ct-h">Got something to build?</h2>
              <p>Tell me what it is and where you&apos;re stuck. A short email is enough to start.</p>
              <div className="row">
                <a className="btn" href={`mailto:${SITE.email}`}>{SITE.email}</a>
                <a className="btn ln" href={SITE.linkedin} target="_blank" rel="noopener">LinkedIn</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="fcols">
            <div>
              <h4>Pages</h4>
              <a href="#top">Home</a><a href="#work">Work</a><a href="#capabilities">Capabilities</a><a href="#experience">Experience</a><a href="#contact">Contact</a>
            </div>
            <div>
              <h4>Projects</h4>
              {projects.map((p) => <a key={p.name} href={p.href} target="_blank" rel="noopener">{p.name}</a>)}
            </div>
            <div>
              <h4>Elsewhere</h4>
              <a href={SITE.github} target="_blank" rel="noopener">GitHub</a>
              <a href={SITE.linkedin} target="_blank" rel="noopener">LinkedIn</a>
              <a href={`mailto:${SITE.email}`}>Email</a>
            </div>
          </div>
          <div className="fbar">
            <span>&copy; {new Date().getFullYear()} Abdul Rauf Azhar</span>
            <span>Rahim Yar Khan, Pakistan &middot; UTC+5</span>
            <a href="#top" style={{ textDecoration: "none" }}>Back to top &uarr;</a>
          </div>
        </div>
        <div className="giant" aria-hidden="true">Abdul Rauf</div>
      </footer>
    </>
  );
}
