import rss from '@astrojs/rss';
import { SITE_NAME, pathFor } from '../lib/site.mjs';

const guides = Object.entries(import.meta.glob('../content/guide/*.md', {eager:true})).map(([file,mod]) => ({slug:file.split('/').at(-1).replace('.md',''),...mod.frontmatter}));
export function GET(context) { return rss({title:`${SITE_NAME} 이용 가이드`,description:'시티투어버스 비교와 예약 전 확인사항',site:context.site,items:guides.map(g => ({title:g.title,description:g.description,pubDate:new Date(g.pubDate),link:pathFor(`/guide/${g.slug}/`)}))}); }
