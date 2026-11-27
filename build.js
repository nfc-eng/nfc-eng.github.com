#!/usr/bin/env node
/**
 * Static build for the personal site.
 *
 * Vercel runs `node build.js` and publishes `dist/`. There are no
 * dependencies. Posts live in posts/*.md. Project copy lives in the
 * PROJECTS list below. Internal links are root-relative so the same
 * files work on a vercel.app hostname and, later, a custom domain.
 *
 * An absolute origin is added to Open Graph tags only when Vercel
 * provides one at build time. Nothing in the source hardcodes a domain.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const POSTS_DIR = path.join(ROOT, "posts");
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SITE = {
  name: "Nicholas Clement",
  title: "Nicholas Clement",
  description: "I build software on the side. Projects I've shipped, three notes from 2020, and a short bio.",
};

// Edit this list to add a project. Link the live site only.
// Teeter is the one public repository.
const PROJECTS = [
  {
    id: "teeter",
    name: "Teeter",
    href: "https://trader-tracker-murex.vercel.app",
    source: "https://github.com/nfc-eng/trader-tracker",
    image: "teeter.png",
    frame: "landscape",
    alt: "Teeter, with the line: an AI bot trades $100 of real money on the Nasdaq and writes down why it makes each trade.",
    description: "An AI bot trades $100 of real money on the Nasdaq, in TQQQ and SQQQ, through Robinhood. It writes down why it makes each trade.",
  },
  {
    id: "ai-daily-flash",
    name: "AI Daily Flash",
    href: "https://ai-daily-flash-clenicho.vercel.app",
    image: "ai-daily-flash.png",
    frame: "flash",
    alt: "The AI Daily Flash homepage: the day's date, an editor's note, and cards for the stories in that edition.",
    description: "A daily AI news briefing for engineers. Each edition is a short read of what is actually happening, and which pieces are worth your time.",
  },
  {
    id: "ai-data-center-tycoon",
    name: "AI Data Center Tycoon",
    href: "https://v0-ai-data-center-game-bie6.vercel.app",
    image: "ai-data-center-tycoon.png",
    frame: "portrait",
    alt: "The AI Data Center Tycoon start screen, with choices to build data centers, buy chips, manage power, or go public.",
    description: "A phone-first game where you build and run an AI data-center empire. You put up data centers, buy chips, manage power, and try to take the company public.",
  },
  {
    id: "happy-hour-finder",
    name: "Happy Hour Finder",
    href: "https://happy-hour-finder-v2.vercel.app",
    image: "happy-hour-finder.png",
    frame: "portrait",
    alt: "Happy Hour Finder, a map of Denver with markers for live happy-hour deals.",
    description: "A phone-first map of live happy-hour deals in Denver. You can search venues, filter to what is open now, and see the specials.",
  },
  {
    id: "ape-odds",
    name: "Ape Odds",
    kicker: "Current startup",
    href: "https://finance-quant-phi.vercel.app",
    image: "ape-odds.png",
    frame: "landscape",
    alt: "The Ape Odds mark on a dark blue field, with the line: Same bet. Better price.",
    description: "A board that finds price gaps between the same bet on prediction markets such as Kalshi and Polymarket, and shows which price is cheaper. It is paper only and does not place orders.",
  },
];

function origin() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "";
}

function absUrl(pathname) {
  const base = origin();
  return base ? base + pathname : pathname;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(url) {
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  throw new Error(`Refusing non-http link in markdown: ${trimmed}`);
}

function inline(raw) {
  let text = escapeHtml(raw);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeHtml(safeHref(href))}">${label}</a>`;
  });
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return text;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  function blank(index) {
    return index >= lines.length || lines[index].trim() === "";
  }

  while (i < lines.length) {
    if (blank(i)) {
      i += 1;
      continue;
    }
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      html.push(`<h2>${inline(trimmed.slice(4))}</h2>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quote.push(lines[i].trim().slice(2));
        i += 1;
      }
      html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\s*\* /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\* /.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\* /, ""))}</li>`);
        i += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const para = [];
    while (i < lines.length && !blank(i) && !lines[i].trim().startsWith("### ") && !lines[i].trim().startsWith("> ") && !/^\s*\* /.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return html.join("\n");
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error("Post is missing front matter");
  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const splitAt = line.indexOf(":");
    if (splitAt === -1) continue;
    const key = line.slice(0, splitAt).trim();
    let value = line.slice(splitAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: match[2] };
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function categoriesOf(raw) {
  if (!raw) return [];
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

function stripInline(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFrom(markdown) {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block && !block.startsWith("###") && !/^\*[^*]+\*$/.test(block));
  const text = stripInline(blocks[0] || "");
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).replace(/\s+\S*$/, "")}…`;
}

function loadPosts() {
  return fs.readdirSync(POSTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, name), "utf8");
      const { data, body } = parseFrontMatter(raw);
      const iso = (data.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Bad date in ${name}`);
      if (!data.permalink || !data.permalink.startsWith("/writing/")) {
        throw new Error(`Post ${name} needs a /writing/ permalink`);
      }
      const permalink = data.permalink.endsWith("/") ? data.permalink : `${data.permalink}/`;
      return {
        title: data.title,
        iso,
        dateLabel: formatDate(iso),
        categories: categoriesOf(data.categories),
        permalink,
        excerpt: excerptFrom(body),
        html: markdownToHtml(body),
      };
    })
    .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
}

function nav(pathname) {
  const items = [
    ["/projects/", "Projects"],
    ["/writing/", "Writing"],
    ["/about/", "About"],
  ];
  const links = items.map(([href, label]) => {
    const current = pathname === href || pathname.startsWith(href);
    return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  return `<nav aria-label="Pages">${links}</nav>`;
}

function header(pathname, homeTitle) {
  const h1 = homeTitle ? `<h1>${escapeHtml(homeTitle)}</h1>` : "";
  return `<header class="masthead">
    <div class="bar">
      <a class="word" href="/">${escapeHtml(SITE.name)}</a>
      ${nav(pathname)}
    </div>
    ${h1}
  </header>`;
}

function footer() {
  return `<footer>
    <p><a href="https://github.com/nfc-eng">GitHub</a> <span class="dot">·</span> <a href="https://www.linkedin.com/in/nicholas-clement-2b3606114/">LinkedIn</a></p>
  </footer>`;
}

function pageShell({ pathname, title, description, body, homeTitle }) {
  const fullTitle = pathname === "/" ? SITE.title : `${title} · ${SITE.name}`;
  const canonical = origin() ? `<link rel="canonical" href="${absUrl(pathname)}">` : "";
  const image = absUrl("/og.png");
  const imageMeta = origin()
    ? `<meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Nicholas Clement. I build side projects and write down what I learn.">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">`
    : `<meta property="og:image" content="/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="/og.png">`;
  const urlMeta = origin() ? `<meta property="og:url" content="${absUrl(pathname)}">` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(SITE.name)}">
  ${canonical}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(SITE.name)}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${urlMeta}
  ${imageMeta}
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#f4f5f2">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&amp;family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&amp;display=swap">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  <main id="content">
    ${header(pathname, homeTitle)}
    ${body}
    ${footer()}
  </main>
</body>
</html>
`;
}

function projectLinks(project) {
  const live = `<a href="${escapeHtml(project.href)}">Live site</a>`;
  if (!project.source) return live;
  return `${live} <span class="dot">·</span> <a href="${escapeHtml(project.source)}">Source</a>`;
}

function projectCard(project, { images }) {
  const kicker = project.kicker ? `<p class="kicker">${escapeHtml(project.kicker)}</p>` : "";
  const media = images
    ? `<div class="card-media ${project.frame}"><img src="/images/${escapeHtml(project.image)}" alt="${escapeHtml(project.alt)}"></div>`
    : "";
  const title = images
    ? escapeHtml(project.name)
    : `<a href="/projects/#${escapeHtml(project.id)}">${escapeHtml(project.name)}</a>`;
  const heading = images ? "h2" : "h3";
  return `<article class="card" id="${escapeHtml(project.id)}">
    ${media}
    <div class="card-body">
      ${kicker}
      <${heading}>${title}</${heading}>
      <p>${escapeHtml(project.description)}</p>
      <p class="card-links">${projectLinks(project)}</p>
    </div>
  </article>`;
}

function writingEntries(posts) {
  return `<div class="entries">${posts.map((post) => {
    const cats = post.categories.length ? ` · ${post.categories.join(" · ")}` : "";
    return `<a class="entry" href="${post.permalink}">
      <span class="kicker">${escapeHtml(post.dateLabel)}${escapeHtml(cats)}</span>
      <span class="entry-title">${escapeHtml(post.title)}</span>
      <span class="entry-excerpt">${escapeHtml(post.excerpt)}</span>
    </a>`;
  }).join("")}</div>`;
}

function homePage(posts) {
  const cards = PROJECTS.map((project) => projectCard(project, { images: false })).join("");
  const body = `
    <p class="dek">This is where those projects live, along with three notes I wrote in 2020.</p>
    <nav class="routes" aria-label="Sections">
      <a href="/projects/"><b>Projects</b><span>Live sites for what I'm building.</span></a>
      <a href="/writing/"><b>Writing</b><span>Three posts from 2020.</span></a>
      <a href="/about/"><b>About</b><span>A short note, and where to find me.</span></a>
    </nav>
    <section aria-labelledby="projects-heading">
      <div class="sec-head">
        <h2 id="projects-heading">Projects</h2>
        <a href="/projects/">All projects</a>
      </div>
      <div class="cards">${cards}</div>
    </section>
    <section aria-labelledby="writing-heading">
      <div class="sec-head">
        <h2 id="writing-heading">Writing</h2>
        <a href="/writing/">All writing</a>
      </div>
      ${writingEntries(posts)}
    </section>`;
  return pageShell({
    pathname: "/",
    title: SITE.title,
    description: SITE.description,
    homeTitle: "I build software on the side.",
    body,
  });
}

function projectsPage() {
  const cards = PROJECTS.map((project) => projectCard(project, { images: true })).join("");
  const body = `
    <div class="page-head">
      <h1>Projects</h1>
      <p class="dek">Ape Odds is my current startup. The others are side projects. Each card links to the live site.</p>
    </div>
    <section>
      <div class="cards">${cards}</div>
    </section>`;
  return pageShell({
    pathname: "/projects/",
    title: "Projects",
    description: "Side projects I've shipped, each with a link to the live site. Ape Odds is my current startup.",
    body,
  });
}

function writingPage(posts) {
  const body = `
    <div class="page-head">
      <h1>Writing</h1>
      <p class="dek">Three posts from 2020. I wrote them down so I would remember how a problem actually got solved.</p>
    </div>
    <section>
      ${writingEntries(posts)}
    </section>`;
  return pageShell({
    pathname: "/writing/",
    title: "Writing",
    description: "Three notes I wrote in 2020, including SES domain verification and DynamoDB streams with Lambda.",
    body,
  });
}

function postPage(post) {
  const cats = post.categories.length ? ` · ${post.categories.join(" · ")}` : "";
  const body = `
    <p class="back"><a href="/writing/">All writing</a></p>
    <div class="page-head">
      <p class="kicker">${escapeHtml(post.dateLabel)}${escapeHtml(cats)}</p>
      <h1>${escapeHtml(post.title)}</h1>
    </div>
    <article class="prose">
      ${post.html}
    </article>`;
  return pageShell({
    pathname: post.permalink,
    title: post.title,
    description: post.excerpt,
    body,
  });
}

function aboutPage() {
  // Update this bio anytime. The 2020 about copy was dropped because it is out of date.
  // The old photo is still in the repo at selfie.JPG if you want it on this page.

  const body = `
    <div class="page-head">
      <h1>About</h1>
      <p class="dek">I'm a software engineer. I build side projects in my spare time.</p>
    </div>
    <section class="prose">
      <p>The projects on this site are the public ones. Most of the repositories are private.</p>
    </section>`;
  return pageShell({
    pathname: "/about/",
    title: "About",
    description: "I'm a software engineer. I build side projects in my spare time.",
    body,
  });
}

function notFoundPage() {
  const body = `
    <div class="page-head">
      <h1>That page isn't here.</h1>
      <p class="dek">The link might be old. The home page has the projects and the writing.</p>
      <p class="card-links" style="margin-top:16px"><a href="/">Back home</a></p>
    </div>`;
  return pageShell({
    pathname: "/404.html",
    title: "Page not found",
    description: "That page isn't on this site.",
    body,
  });
}

function writeFile(rel, contents) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, contents);
}

function copyFile(from, rel) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
}

function assertSite(htmlByPath) {
  const joined = Object.values(htmlByPath).join("\n").replace(/<!--[\s\S]*?-->/g, "");
  const banned = [
    /nicholasclement\.com/i,
    /Nicholas is\b/,
    /Nicholas Clement is\b/,
    /his startup/i,
    /\bhe builds\b/i,
    /HottestHappyHours/i,
    /Software Engineer at AWS/i,
  ];
  for (const pattern of banned) {
    if (pattern.test(joined)) throw new Error(`Banned copy matched ${pattern}`);
  }
  if (!fs.existsSync(path.join(DIST, "og.png"))) throw new Error("Missing og.png");
  if (!fs.existsSync(path.join(DIST, "favicon.svg"))) throw new Error("Missing favicon");
  for (const project of PROJECTS) {
    if (!project.description || project.description.length > 280) {
      throw new Error(`Description length looks wrong for ${project.name}`);
    }
    if (!fs.existsSync(path.join(DIST, "images", project.image))) {
      throw new Error(`Missing image for ${project.name}`);
    }
  }
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  copyFile(path.join(ROOT, "style.css"), "style.css");
  copyFile(path.join(ROOT, "favicon.svg"), "favicon.svg");
  copyFile(path.join(ROOT, "assets", "og.png"), "og.png");
  for (const project of PROJECTS) {
    copyFile(path.join(ROOT, "assets", "projects", project.image), path.join("images", project.image));
  }

  const posts = loadPosts();
  if (posts.length !== 3) throw new Error(`Expected 3 posts, found ${posts.length}`);

  const pages = {
    "index.html": homePage(posts),
    "projects/index.html": projectsPage(),
    "writing/index.html": writingPage(posts),
    "about/index.html": aboutPage(),
    "404.html": notFoundPage(),
  };
  for (const post of posts) {
    const rel = `${post.permalink.replace(/^\//, "").replace(/\/$/, "")}/index.html`;
    pages[rel] = postPage(post);
  }
  for (const [rel, html] of Object.entries(pages)) writeFile(rel, html);

  assertSite(pages);
  console.log(`Built ${Object.keys(pages).length} pages in dist/`);
}

main();
