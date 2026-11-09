import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const settings = JSON.parse(await readFile(resolve(root, "data/social-links.json"), "utf8"));
const icons = {
    YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>',
    Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4Z"/></svg>',
    TikTok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 6.1a5.4 5.4 0 0 1-3.3-4.4V1h-3.8v14.8a3.2 3.2 0 1 1-2.8-3.2V8.8a7 7 0 1 0 6.6 7V8.2a9.1 9.1 0 0 0 5.2 1.6V6a5.4 5.4 0 0 1-1.9.1Z"/></svg>',
    Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm5 3.1a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 2.2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm5-3.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"/></svg>',
};

const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

if (!Array.isArray(settings.accounts) || settings.accounts.length !== 4) {
    throw new Error("Social settings must define YouTube, Facebook, TikTok, and Instagram.");
}

export const renderSocialLinks = () => `<nav class="brand-social-links" aria-label="CALIST PRO social media">
${settings.accounts.map(({ platform, url, placeholder }) => {
    const icon = icons[platform];
    if (!icon) throw new Error(`Missing social icon for ${platform}.`);
    if (url) {
        return `              <a class="brand-social-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="CALIST PRO on ${escapeHtml(platform)}">
                ${icon}<span>${escapeHtml(platform)}</span>
              </a>`;
    }

    if (platform !== "Instagram" || !placeholder) {
        throw new Error(`A social link URL or placeholder is required for ${platform}.`);
    }
    return `              <span class="brand-social-link is-unavailable" aria-label="Instagram link coming soon">
                ${icon}<span>Instagram<small>Coming soon</small></span>
              </span>`;
}).join("\n")}
            </nav>`;
