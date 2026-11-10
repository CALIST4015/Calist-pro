import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSocialLinks } from "./social-links.mjs";
import { renderCategoryCardPreview, renderCategoryWork, renderHomeFeaturedWork, renderServicePreview, workPreviewFiles } from "./work-links.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(root, "src/index.template.html");
const componentNames = ["navbar", "hero", "about", "services", "portfolio", "contact", "footer"];
const processPages = ["pre-production.html", "production.html", "post-production.html"];
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

if (html.split("<!-- social-links -->").length !== 2) {
    throw new Error("Expected exactly one social-links placeholder in the portfolio component.");
}
html = html.replace("<!-- social-links -->", renderSocialLinks());

const generatedSections = [
    ["<!-- home-featured-work -->", renderHomeFeaturedWork()],
    ["<!-- category-card-preview:graphics -->", renderCategoryCardPreview("graphics")],
    ["<!-- category-card-preview:photography -->", renderCategoryCardPreview("photography")],
    ["<!-- category-card-preview:videography -->", renderCategoryCardPreview("videography")],
    ["<!-- category-card-preview:motion-graphics -->", renderCategoryCardPreview("motion-graphics")],
    ["<!-- service-preview:photography -->", renderServicePreview("photography")],
    ["<!-- service-preview:videography -->", renderServicePreview("videography")],
    ["<!-- service-preview:motion-graphics -->", renderServicePreview("motion-graphics")],
    ["<!-- service-preview:graphics -->", renderServicePreview("graphics")],
];
for (const [marker, content] of generatedSections) {
    if (html.split(marker).length !== 2) {
        throw new Error(`Expected exactly one ${marker} placeholder in the HTML components.`);
    }
    html = html.replace(marker, content);
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

const galleryCategories = ["videos.html", "photography.html", "graphics.html", "motion-graphics.html"];

const galleryIds = new Map([
    ["graphics.html", "graphics"],
    ["photography.html", "photography"],
    ["videos.html", "videography"],
    ["motion-graphics.html", "motion-graphics"],
]);

for (const pageName of galleryCategories) {
    const pagePath = resolve(root, pageName);
    let page = await readFile(pagePath, "utf8");
    const socialContainerStart = page.indexOf('<div class="category-social-links">');
    const containerStart = page.indexOf('<div class="category-work-grid social-portfolio-grid">');
    if (socialContainerStart >= 0) {
        const containerEnd = page.indexOf("</div>", socialContainerStart);
        if (containerEnd < 0) throw new Error(`Missing social links container end in ${pageName}.`);
        page = `${page.slice(0, socialContainerStart)}<div class="category-social-links">\n${renderSocialLinks()}\n        </div>${page.slice(containerEnd + "</div>".length)}`;
    } else {
        const startMarker = "<!-- portfolio-items:start -->";
        const endMarker = "<!-- portfolio-items:end -->";
        const start = page.indexOf(startMarker, containerStart);
        const end = page.indexOf(endMarker, start + startMarker.length);
        const containerEnd = page.indexOf("</div>", end + endMarker.length);
        if (containerStart < 0 || start < 0 || end < 0 || containerEnd < 0) {
            throw new Error(`Missing gallery markers in ${pageName}.`);
        }
        page = `${page.slice(0, containerStart)}<div class="category-social-links">\n${renderSocialLinks()}\n        </div>${page.slice(containerEnd + "</div>".length)}`;
    }

    const categoryId = galleryIds.get(pageName);
    const workStartMarker = `<!-- category-work:${categoryId}:start -->`;
    const workEndMarker = `<!-- category-work:${categoryId}:end -->`;
    const workStart = page.indexOf(workStartMarker);
    const workEnd = page.indexOf(workEndMarker);
    if (workStart >= 0 || workEnd >= 0) {
        if (workStart < 0 || workEnd < workStart ||
            page.indexOf(workStartMarker, workStart + workStartMarker.length) >= 0 ||
            page.indexOf(workEndMarker, workEnd + workEndMarker.length) >= 0) {
            throw new Error(`Invalid work gallery markers in ${pageName}.`);
        }
        page = `${page.slice(0, workStart + workStartMarker.length)}\n${renderCategoryWork(categoryId)}\n${page.slice(workEnd)}`;
    } else {
        const legacyMarker = `<!-- category-work:${categoryId} -->`;
        if (page.split(legacyMarker).length === 2) {
            page = page.replace(legacyMarker, `${workStartMarker}\n${renderCategoryWork(categoryId)}\n${workEndMarker}`);
        } else {
            const galleryStart = page.indexOf('<div class="category-work-grid social-portfolio-grid"');
            const galleryOpenEnd = page.indexOf(">", galleryStart);
            const returnStart = page.indexOf('<p class="category-return"', galleryOpenEnd);
            const galleryClose = returnStart < 0 ? -1 : page.lastIndexOf("</div>", returnStart);
            if (galleryStart < 0 || galleryOpenEnd < 0 || galleryClose < galleryOpenEnd) {
                throw new Error(`Missing work gallery in ${pageName}.`);
            }
            page = `${page.slice(0, galleryOpenEnd + 1)}\n${workStartMarker}\n${renderCategoryWork(categoryId)}\n${workEndMarker}\n${page.slice(galleryClose)}`;
        }
    }
    page = page.replace(/ Profile links are temporary placeholders\./g, "");

    await writeFile(pagePath, page, "utf8");
    console.log(`Built ${pageName} social links.`);
}

const deployDirectory = resolve(root, "dist");
await rm(deployDirectory, { recursive: true, force: true });
await mkdir(deployDirectory, { recursive: true });

const deployFiles = [...new Set([
    "index.html",
    ...galleryCategories,
    ...processPages,
    "style.css",
    "Calist.Pro.png",
    "CALIST PRO COVER.jpg",
    "resourses/DSC_5268.jpg",
    ...workPreviewFiles,
])];

for (const filename of deployFiles) {
    await mkdir(dirname(resolve(deployDirectory, filename)), { recursive: true });
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
