import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(root, "src/index.template.html");
const componentNames = ["navbar", "hero", "about", "services", "portfolio", "contact", "footer"];
let html = await readFile(templatePath, "utf8");

for (const name of componentNames) {
    const marker = `<!-- component:${name} -->`;
    if (html.split(marker).length !== 2) {
        throw new Error(`Expected exactly one ${marker} placeholder in the HTML template.`);
    }

    const componentPath = resolve(root, `components/${name}.html`);
    const component = await readFile(componentPath, "utf8");
    html = html.replace(marker, component.trimEnd());
}

if (/<!-- component:[^>]+ -->/.test(html)) {
    throw new Error("The HTML template contains an unresolved component placeholder.");
}

const localReferences = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)]
    .map((match) => match[1].split(/[?#]/, 1)[0])
    .filter((reference) => !/^(?:[a-z]+:|#|\/\/)/i.test(reference));

for (const reference of localReferences) {
    try {
        await access(resolve(root, reference));
    } catch {
        throw new Error(`Referenced local file does not exist: ${reference}`);
    }
}

await writeFile(resolve(root, "index.html"), html, "utf8");
console.log(`Built index.html with ${componentNames.length} components and ${localReferences.length} local files checked.`);

const galleryCategories = [
    {
        page: "videos.html",
        links: [
            { platform: "YouTube", url: "https://www.youtube.com/@your-channel", description: "Watch films, stories, and recent video projects." },
            { platform: "Instagram", url: "https://www.instagram.com/your-username/", description: "Follow short-form video, reels, and behind-the-scenes updates." },
            { platform: "TikTok", url: "https://www.tiktok.com/@your-username", description: "See quick edits and new video highlights." },
        ],
    },
    {
        page: "photography.html",
        links: [
            { platform: "Instagram", url: "https://www.instagram.com/your-username/", description: "Browse recent portraits, events, and image stories." },
            { platform: "Facebook", url: "https://www.facebook.com/your-page/", description: "Follow photography projects and studio updates." },
            { platform: "Flickr", url: "https://www.flickr.com/people/your-username/", description: "Explore curated photography collections." },
        ],
    },
    {
        page: "graphics.html",
        links: [
            { platform: "Behance", url: "https://www.behance.net/your-username", description: "Explore selected graphic design projects and case studies." },
            { platform: "Instagram", url: "https://www.instagram.com/your-username/", description: "See new visual designs and creative updates." },
            { platform: "Pinterest", url: "https://www.pinterest.com/your-username/", description: "Browse graphic design inspiration and project boards." },
        ],
    },
    {
        page: "motion-graphics.html",
        links: [
            { platform: "Instagram", url: "https://www.instagram.com/your-username/", description: "Watch motion work, reels, and creative process clips." },
            { platform: "YouTube", url: "https://www.youtube.com/@your-channel", description: "See motion graphics projects and video showcases." },
            { platform: "TikTok", url: "https://www.tiktok.com/@your-username", description: "Catch short motion design edits and highlights." },
        ],
    },
];

const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

for (const category of galleryCategories) {
    const cards = category.links.map(({ platform, url, description }) => `          <article class="social-portfolio-card">
            <p class="social-portfolio-platform">${escapeHtml(platform)}</p>
            <h2>Find CALIST PRO on ${escapeHtml(platform)}</h2>
            <p>${escapeHtml(description)}</p>
            <a class="button button-light" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
              Visit ${escapeHtml(platform)} <span aria-hidden="true">↗</span>
            </a>
          </article>`).join("\n");
    const pagePath = resolve(root, category.page);
    let page = await readFile(pagePath, "utf8");
    const startMarker = "<!-- portfolio-items:start -->";
    const endMarker = "<!-- portfolio-items:end -->";
    const start = page.indexOf(startMarker);
    const end = page.indexOf(endMarker, start + startMarker.length);

    if (start < 0 || end < 0) {
        throw new Error(`Missing gallery markers in ${category.page}.`);
    }

    page = `${page.slice(0, start + startMarker.length)}\n${cards}\n          ${page.slice(end)}`;
    page = page.replace(/<p class="media-protection-note">[\s\S]*?<\/p>\s*/, "");
    page = page.replace("class=\"category-work-grid\"", "class=\"category-work-grid social-portfolio-grid\"");

    await writeFile(pagePath, page, "utf8");
    console.log(`Built ${category.page} with ${category.links.length} social links.`);
}

const deployDirectory = resolve(root, "dist");
await rm(deployDirectory, { recursive: true, force: true });
await mkdir(deployDirectory, { recursive: true });

const deployFiles = [
    "index.html",
    ...galleryCategories.map((category) => category.page),
    "style.css",
    "Calist.Pro.png",
];

for (const filename of deployFiles) {
    await cp(resolve(root, filename), resolve(deployDirectory, filename));
}

for (const directory of ["styles", "scripts"]) {
    await mkdir(resolve(deployDirectory, directory), { recursive: true });
}
await cp(resolve(root, "styles/calist-pro.css"), resolve(deployDirectory, "styles/calist-pro.css"));
await cp(resolve(root, "scripts/site.js"), resolve(deployDirectory, "scripts/site.js"));

const deployReferences = [];
for (const pageName of deployFiles.filter((filename) => filename.endsWith(".html"))) {
    const page = await readFile(resolve(deployDirectory, pageName), "utf8");
    for (const match of page.matchAll(/\b(?:src|href|poster|data-preview-src)="([^"]+)"/g)) {
        const reference = match[1].split(/[?#]/, 1)[0];
        if (!reference || /^(?:[a-z]+:|#|\/\/)/i.test(reference)) continue;

        let decodedReference = reference;
        try {
            decodedReference = decodeURIComponent(reference);
        } catch {
            throw new Error(`Invalid URL encoding in ${pageName}: ${reference}`);
        }

        deployReferences.push({ pageName, reference: decodedReference });
    }
}

for (const { pageName, reference } of deployReferences) {
    try {
        await access(resolve(deployDirectory, reference));
    } catch {
        throw new Error(`Deploy output from ${pageName} references a missing file: ${reference}`);
    }
}

console.log(`Prepared Cloudflare Pages dist directory with ${deployFiles.length + 2} pages/assets and ${deployReferences.length} local references checked.`);
