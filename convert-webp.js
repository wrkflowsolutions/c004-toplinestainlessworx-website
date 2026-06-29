// One-off WebP conversion script. Converts referenced raster images under
// assets/images/ to .webp (preserving originals). Run: node convert-webp.js [--dry]
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry');

// Recursively collect png/jpg/jpeg under assets/images
function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, 'assets', 'images')).sort();

function fmt(b) { return (b / 1048576).toFixed(2) + ' MB'; }

(async () => {
  let totalOld = 0, totalNew = 0;
  const rows = [];
  for (const src of files) {
    const meta = await sharp(src).metadata();
    const oldSize = fs.statSync(src).size;
    const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');

    // Cap very large dimensions at 2000px on the long edge (display never needs more)
    let pipeline = sharp(src);
    const longEdge = Math.max(meta.width, meta.height);
    let resizedNote = '';
    if (longEdge > 2000) {
      pipeline = pipeline.resize({ width: meta.width >= meta.height ? 2000 : null,
                                   height: meta.height > meta.width ? 2000 : null,
                                   withoutEnlargement: true });
      resizedNote = ` (resized from ${longEdge}px)`;
    }

    if (!DRY) {
      await pipeline.webp({ quality: 82, effort: 5 }).toFile(dest);
    }
    const newSize = DRY ? 0 : fs.statSync(dest).size;
    totalOld += oldSize; totalNew += newSize;
    const rel = path.relative(ROOT, src).replace(/\\/g, '/');
    rows.push({ rel, oldSize, newSize, resizedNote, dims: `${meta.width}x${meta.height}` });
    const pct = newSize ? ((1 - newSize / oldSize) * 100).toFixed(0) : '?';
    console.log(`${fmt(oldSize).padStart(9)} -> ${fmt(newSize).padStart(9)}  (-${pct}%)  ${rel}${resizedNote}`);
  }
  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL: ${fmt(totalOld)} -> ${fmt(totalNew)}  (-${((1 - totalNew / totalOld) * 100).toFixed(1)}%)  over ${files.length} files`);
})();
