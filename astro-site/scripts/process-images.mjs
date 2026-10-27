import { readdir, mkdir } from 'node:fs/promises';
import { resolve, parse } from 'node:path';
import sharp from 'sharp';

const source = resolve('public/images/source');
const target = resolve('public/images/optimized');
await mkdir(target, {recursive:true});
for (const name of await readdir(source)) {
  if (!/\.(svg|png|jpe?g|webp)$/i.test(name)) continue;
  const output = resolve(target, `${parse(name).name}.webp`);
  await sharp(resolve(source,name)).resize({width:1600,withoutEnlargement:true}).webp({quality:80,effort:5}).toFile(output);
  console.log(`${name} → ${parse(name).name}.webp`);
}
