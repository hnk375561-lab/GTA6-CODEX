import sharp from 'sharp';
import { existsSync } from 'fs';

const map = {
  'astillero-brian-heder.png': 'astillero-brian-heder',
  'gambit-bay.png': 'gambit-bay',
  'vice-city-port.jpg': 'vice-city-port',
  'tisha-wocka.jpg': 'tisha-wocka',
  'tequesta.jpg': 'tequesta',
  'southside-vice-city.jpg': 'southside-vice-city',
  'penitenciaria-leonida.jpg': 'penitenciaria-leonida',
  'leonida.jpg': 'leonida',
  'la-perle.jpg': 'la-perle',
  'downtown-vice-city.png': 'downtown-vice-city',
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
