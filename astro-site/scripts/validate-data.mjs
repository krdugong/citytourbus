import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const file = resolve('data/citybus.csv');
const rows = parse(readFileSync(file,'utf8'), { columns:true, bom:true, skip_empty_lines:true, trim:true, info:true });
const errors = [];
const seenCities = new Set();
const seenProducts = new Set();
const cityRows = rows.filter(({record:r}) => r.row_type === 'city');
const slugSet = new Set(cityRows.map(({record:r}) => r.city_slug));
const required = {
  city:['city','country','city_slug','city_intro','updated_at'],
  product:['city_slug','product_id','operator','product_name','booking_link'],
  faq:['city_slug','faq_q','faq_a']
};
const dateFields = ['updated_at','verified_at'];
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const validHttp = value => /^https?:\/\//i.test(value) && (()=>{try {return Boolean(new URL(value).hostname);}catch{return false;}})();
for (const {record:r,info} of rows) {
  const n = info.lines;
  if (!required[r.row_type]) { errors.push(`행 ${n}: row_type 오류`); continue; }
  for (const key of required[r.row_type]) if (!r[key]) errors.push(`행 ${n}: ${key} 필수값 누락`);
  if (r.city_slug && !/^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/i.test(r.city_slug)) errors.push(`행 ${n}: city_slug 형식 오류`);
  for (const key of dateFields) if (r[key] && !validDate(r[key])) errors.push(`행 ${n}: ${key} 날짜 형식 오류`);
  for (const key of ['booking_link','source','official_site']) if (r[key] && !validHttp(r[key])) errors.push(`행 ${n}: ${key} URL 형식 오류`);
  if (r.row_type === 'product' && r.booking_link && !validHttp(r.booking_link)) errors.push(`행 ${n}: booking_link는 http:// 또는 https://로 시작해야 합니다`);
  for (const key of ['hero_image','image']) if (r[key] && !existsSync(resolve('public/images/source',r[key]))) errors.push(`행 ${n}: ${key} 이미지 파일 없음 (${r[key]})`);
  if (r.row_type === 'city') {
    if (seenCities.has(r.city_slug)) errors.push(`행 ${n}: city_slug 중복 (${r.city_slug})`);
    seenCities.add(r.city_slug);
  } else if (!slugSet.has(r.city_slug)) errors.push(`행 ${n}: 연결된 city 행 없음 (${r.city_slug})`);
  if (r.row_type === 'product') {
    if (seenProducts.has(r.product_id)) errors.push(`행 ${n}: product_id 중복 (${r.product_id})`);
    seenProducts.add(r.product_id);
    if (r.image && !r.image_alt) errors.push(`행 ${n}: image_alt 필수값 누락`);
    if (r.hop_on_hop_off && !['yes','no'].includes(r.hop_on_hop_off)) errors.push(`행 ${n}: hop_on_hop_off 값 오류`);
    for (const key of ['night_tour','mobile_ticket']) if (r[key] && !['yes','no'].includes(r[key])) errors.push(`행 ${n}: ${key} 값 오류`);
  }
  if (r.row_type === 'city' && r.hero_image && !r.hero_image_alt) errors.push(`행 ${n}: hero_image_alt 필수값 누락`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const today = Date.now();
for (const {record:r,info} of rows.filter(({record:r}) => r.row_type === 'product')) {
  if (!r.verified_at) continue;
  const days = Math.floor((today - new Date(`${r.verified_at}T00:00:00+09:00`).getTime()) / 86400000);
  if (days > 30) console.warn(`WARNING 행 ${info.lines}: ${r.product_id} ${days >= 90 ? '최근 정보 확인이 필요합니다' : '재확인 필요'} (${days}일)`);
}
console.log(`검증 완료: 도시 ${cityRows.length}개, 상품 ${seenProducts.size}개, 전체 ${rows.length}행`);
