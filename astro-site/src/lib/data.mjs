import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const csvPath = resolve(process.cwd(), 'data/citybus.csv');
export const rows = parse(readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });
const bySort = (a,b) => Number(a.sort || 999) - Number(b.sort || 999);
export const cities = rows.filter(r => r.row_type === 'city').sort(bySort).map(city => ({
  ...city,
  products: rows.filter(r => r.row_type === 'product' && r.city_slug === city.city_slug).sort(bySort),
  faqs: rows.filter(r => r.row_type === 'faq' && r.city_slug === city.city_slug).sort(bySort)
}));
export const countries = [...new Set(cities.map(c => c.country))];
export const operators = city => [...new Set(city.products.map(p => p.operator))];
export const latestDate = city => [city.updated_at, ...city.products.map(p => p.verified_at)].filter(Boolean).sort().at(-1) || '';
export const relatedCities = city => [...cities.filter(c => c.city_slug !== city.city_slug && c.country === city.country), ...cities.filter(c => c.city_slug !== city.city_slug && c.country !== city.country)].slice(0,8);
