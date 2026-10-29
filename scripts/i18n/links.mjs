// Language links shared by the Korean builder (scripts/keyword-pages/build.mjs) and scripts/i18n/build_i18n.mjs.
// A page has an English/Japanese version when data/i18n/<lang>/<slug>.json exists.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://www.citytourbus.kr';
export const LANG_NAMES = { en: 'English', ja: '日本語' };
const has = (lang, slug) => fs.existsSync(path.join(ROOT, 'data/i18n', lang, `${slug}.json`));

// <link rel="alternate" hreflang> set for one page; empty when the page has no translation
export function alternates(slug) {
  const langs = Object.keys(LANG_NAMES).filter(l => has(l, slug));
  if (!langs.length) return '';
  return [`<link rel="alternate" hreflang="ko" href="${SITE}/${slug}">`, ...langs.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/${slug}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}/${langs.includes('en') ? 'en/' : ''}${slug}">`].join('');
}

// header links to the other language versions of the same page
export function langLinks(slug, current) {
  const out = [];
  if (current !== 'ko') out.push(`<a href="/${slug}" hreflang="ko" lang="ko">한국어</a>`);
  for (const l of Object.keys(LANG_NAMES)) if (l !== current && has(l, slug)) out.push(`<a href="/${l}/${slug}" hreflang="${l}" lang="${l}">${LANG_NAMES[l]}</a>`);
  return out.join('');
}
