// Shared <head> pieces so the generated city pages (scripts/keyword-pages/build.mjs) and the hand-written pages
// (scripts/add_analytics.mjs, scripts/head_tweaks.mjs) carry exactly the same markup. No side effects on import.

// Analytics: gtag.js loads async; /analytics.js is deferred so it never blocks rendering (it only queues the gtag
// config and loads Naver Analytics).
export const GA_ID = 'G-BS2Y7SJ7BT';
export const TAG = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script defer src="/analytics.js"></script>`;
// Matches any earlier form of the tag (with or without defer) so it can be swapped for the current one.
export const TAG_RE = /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+"><\/script><script(?: defer)? src="\/analytics\.js"><\/script>/;

// Fonts: only the three weights the CSS uses, loaded without blocking the first paint (media="print" swap with a
// <noscript> fallback), plus preconnect to the host the font files come from.
export const FONT_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;800&display=swap';
export const PRECONNECT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
export const fontLinks = (href = FONT_URL) => `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${href}"></noscript>`;

// Icons: search engines show the favicon next to results; .ico first for crawlers that skip SVG.
export const ICONS = '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">';
