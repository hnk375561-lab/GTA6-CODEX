import sharp from 'sharp';
import { existsSync } from 'fs';

const map = {
  'astillero-brian-heder.png': 'astillero-brian-heder',
  'gambit-bay.png': 'gambit-bay',
  'vice-city-port.png': 'vice-city-port',
  'tisha-wocka.png': 'tisha-wocka',
  'tequesta.png': 'tequesta',
  'southside-vice-city.png': 'southside-vice-city',
  'penitenciaria-leonida.png': 'penitenciaria-leonida',
  'leonida.png': 'leonida',
  'la-perle.png': 'la-perle',
};

for (const [src, slug] of Object.entries(map)) {
  const inputPath = `incoming/${src}`;
  if (!existsSync(inputPath)) {
    console.log(`SKIP (no existe): ${inputPath}`);
    continue;
  }
  const outPath = `public/images/entities/ubicaciones/${slug}.webp`;
  await sharp(inputPath).resize(1600, 900, { fit: 'cover' }).webp({ quality: 82 }).toFile(outPath);
  console.log(`OK -> ${outPath}`);
}
