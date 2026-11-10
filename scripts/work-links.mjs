import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const settings = JSON.parse(await readFile(resolve(root, "data/work-links.json"), "utf8"));
const platforms = ["Facebook", "Instagram", "TikTok", "YouTube"];
const categories = new Map(settings.categories.map((category) => [category.id, category]));

const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

if (categories.size !== 4 || settings.categories.some(({ items }) =>
    !Array.isArray(items) || items.length !== platforms.length ||
    platforms.some((platform, index) => items[index]?.platform !== platform))) {
    throw new Error("Work settings must define four categories with Facebook, Instagram, TikTok, and YouTube links in order.");
}

for (const category of settings.categories) {
    if (!category.title || !category.service || !category.page ||
        category.items.some(({ url }) =>
            typeof url !== "string" || !url.startsWith("https://"))) {
        throw new Error(`Invalid work links for ${category.id}.`);
    }
    if (category.items.some(({ platform, preview }) =>
        (preview !== undefined &&
            (typeof preview !== "string" || !preview.startsWith("media-previews/social/") || preview.includes(".."))) ||
        (platform !== "TikTok" && preview === undefined))) {
        throw new Error(`Invalid or missing local post preview image for ${category.id}.`);
    }
}

export const workPreviewFiles = [...new Set(settings.categories.flatMap(({ items }) =>
    items.map(({ preview }) => preview).filter(Boolean)))];

const getCategory = (id) => {
    const category = categories.get(id);
    if (!category) throw new Error(`Unknown work category: ${id}.`);
    return category;
};

const renderArt = (category, item, className = "work-preview-art") => {
    const preview = item.preview
        ? `<img src="${escapeHtml(item.preview)}" alt="" loading="lazy" decoding="async">`
        : `<span class="work-preview-fallback-platform">${escapeHtml(item.platform)}</span><strong>${escapeHtml(category.title)}</strong><span class="work-preview-fallback-link">Open on ${escapeHtml(item.platform)} ↗</span>`;
    return `<div class="${className}${item.preview ? "" : " work-preview-fallback"}" aria-hidden="true">${preview}</div>`;
};

export const renderCategoryCardPreview = (id) => {
    const category = getCategory(id);
    const item = category.items[0];
    return `<img class="category-card-preview" src="${escapeHtml(item.preview)}" alt="" loading="lazy" decoding="async">`;
};

export const renderHomeFeaturedWork = () => settings.categories.map((category) => {
    const item = category.items[0];
    return `            <a class="featured-card featured-card-social" href="${escapeHtml(category.page)}" aria-label="Explore ${escapeHtml(category.title)} in the portfolio">
              ${renderArt(category, item, "featured-preview-art work-preview-art")}
              <span><span>Featured work</span><strong>${escapeHtml(category.title)}</strong></span>
              <span class="featured-arrow" aria-hidden="true">↗</span>
            </a>`;
}).join("\n");

export const renderServicePreview = (id) => {
    const category = getCategory(id);
    const item = category.items[0];
    return `<a class="service-visual service-visual-social work-service-preview" href="${escapeHtml(category.page)}" aria-label="View ${escapeHtml(category.service)} work in the portfolio">
              ${renderArt(category, item)}
              <span class="work-service-label">${escapeHtml(category.service)} <span aria-hidden="true">↗</span></span>
            </a>`;
};

export const renderCategoryWork = (id) => {
    const category = getCategory(id);
    return category.items.map((item) => `            <article class="social-portfolio-card work-preview-card">
              <a class="work-preview-link-image" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(category.title)} work on ${escapeHtml(item.platform)}">
                ${renderArt(category, item)}
              </a>
              <p class="social-portfolio-platform">${escapeHtml(item.platform)}</p>
              <h2>${escapeHtml(category.title)} on ${escapeHtml(item.platform)}</h2>
              <a class="button button-dark work-preview-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open on ${escapeHtml(item.platform)} <span aria-hidden="true">↗</span></a>
            </article>`).join("\n");
};
