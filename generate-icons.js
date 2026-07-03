/**
 * generate-icons.js
 * Generates icon-192.png and icon-512.png from icon.svg using sharp.
 * Run once: node generate-icons.js
 */
const sharp = require('sharp');
const path  = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
const svgPath  = path.join(iconsDir, 'icon.svg');

async function main() {
  const sizes = [192, 512];
  for (const size of sizes) {
    const out = path.join(iconsDir, `icon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ Created ${out}`);
  }
  // Also create a 180x180 apple-touch-icon
  const apple = path.join(iconsDir, 'apple-touch-icon.png');
  await sharp(svgPath).resize(180, 180).png().toFile(apple);
  console.log(`✓ Created ${apple}`);

  // Create a 32x32 favicon.ico equivalent (PNG, browsers accept PNG favicons)
  const favicon = path.join(iconsDir, 'favicon.png');
  await sharp(svgPath).resize(32, 32).png().toFile(favicon);
  console.log(`✓ Created ${favicon}`);
}

main().catch(err => { console.error(err); process.exit(1); });
