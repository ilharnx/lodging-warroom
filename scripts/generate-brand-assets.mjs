/**
 * Generate brand assets: OG image, favicon, apple-touch-icon.
 *
 * BRAND ASSETS — DO NOT MODIFY without explicit request.
 *
 * Run: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

// ─── Topographic contour paths (same as layout.tsx background) ───
const topoPaths = `
  <g fill="none" stroke="#B8A48E" stroke-width="0.8" stroke-linecap="round" opacity="0.08">
    <path d="M520 180c-30 20-80 10-110 40s-20 70 10 100 80 30 120 10 50-60 30-100-20-70-50-50" />
    <path d="M530 200c-25 15-65 5-90 30s-15 55 10 80 65 25 95 8 40-48 24-80-16-55-39-38" />
    <path d="M538 218c-20 12-50 2-70 22s-10 42 8 62 50 20 72 6 30-38 18-62-12-42-28-28" />
    <path d="M544 234c-14 8-36 0-50 15s-6 30 6 45 36 14 52 4 22-28 13-45-8-30-21-19" />
    <path d="M548 248c-8 5-22-2-32 10s-3 20 5 30 24 10 34 3 14-18 8-30-6-20-15-13" />
  </g>
  <g fill="none" stroke="#B8A48E" stroke-width="0.8" stroke-linecap="round" opacity="0.07">
    <path d="M180 520c35-25 95-15 130-50s25-85-15-120-95-35-140-12-60 72-35 120 25 85 60 62" />
    <path d="M195 505c28-20 75-10 105-38s18-65-12-95-75-28-110-10-48 56-28 94 20 68 45 49" />
    <path d="M208 490c22-15 58-6 82-28s12-48-10-72-58-22-84-8-36 42-22-72 15-52 34-36" />
    <path d="M220 478c16-10 42-3 60-20s8-35-8-52-42-16-60-6-26 30-16 52 10-38 24-26" />
  </g>
  <g fill="none" stroke="#B8A48E" stroke-width="0.6" stroke-linecap="round" opacity="0.06">
    <path d="M380 380c-20 15-55 8-78 30s-14 50 8 72 55 22 80 8 36-42 22-72-14-52-32-38" />
    <path d="M388 395c-14 10-40 5-56 20s-8 35 6 52 40 16 58 6 26-30 16-52-10-38-24-26" />
    <path d="M394 408c-8 6-25 2-36 12s-4 22 5 32 25 10 36 4 16-18 10-32-6-24-15-16" />
  </g>
  <g fill="none" stroke="#B8A48E" stroke-width="0.6" stroke-linecap="round" opacity="0.06">
    <path d="M-20 100c80-15 160 20 260-5s120-30 180 10 100 15 200-10" />
    <path d="M-20 300c60 18 140-12 220 8s100 22 160-8 80-12 140 14 100 10 140-6" />
    <path d="M-20 500c70-10 130 15 200 0s90-20 150 8 80 14 120-5 70-10 100 8" />
    <path d="M-20 680c50 12 110-8 180 6s80 15 140-10 90-8 130 12 80 6 120-8" />
  </g>
`;

// ─── 1. OG Image (1200×630) ───
async function generateOgImage() {
  const width = 1200;
  const height = 630;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Cream background -->
  <rect width="${width}" height="${height}" fill="#F5F0E8" />

  <!-- Topo contours scaled to 1200×630 -->
  <g transform="scale(1.5, 0.7875)">
    ${topoPaths}
  </g>

  <!-- Wordmark: "stay." — Georgia as Fraunces fallback -->
  <text x="600" y="290" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="82" font-weight="700"
        fill="#2E2A26" letter-spacing="-1">stay<tspan fill="#C4725A">.</tspan></text>

  <!-- Tagline — system sans as Plus Jakarta Sans fallback -->
  <text x="600" y="340" text-anchor="middle"
        font-family="sans-serif" font-size="24" font-weight="300"
        fill="#7A7269">Plan where to stay together</text>

  <!-- Domain — monospace as IBM Plex Mono fallback -->
  <text x="${width - 40}" y="${height - 30}" text-anchor="end"
        font-family="monospace" font-size="14" font-weight="400"
        fill="#B8A48E">stay.functionlabs.com</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, "og-image.png"));

  console.log("✓ /public/og-image.png (1200×630)");
}

// ─── 2. Apple Touch Icon (180×180) ───
async function generateAppleTouchIcon() {
  const size = 180;

  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="40" fill="#F5F0E8" />
  <circle cx="90" cy="86" r="52" fill="#C4725A" />
  <text x="90" y="108" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700"
        fill="#F5F0E8">s</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));

  console.log("✓ /public/apple-touch-icon.png (180×180)");
}

// ─── 3. Favicon (32×32) ───
async function generateFavicon() {
  const size = 32;

  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="16" fill="#C4725A" />
  <text x="16" y="23" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700"
        fill="#F5F0E8">s</text>
</svg>`;

  // Generate as ICO via PNG conversion
  const pngBuf = await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toBuffer();

  // Write PNG-based favicon (universally supported, .ico wrapper not needed)
  writeFileSync(join(publicDir, "favicon.png"), pngBuf);

  // Also write .ico (simply a 32×32 PNG — all modern browsers accept this)
  writeFileSync(join(publicDir, "favicon.ico"), pngBuf);

  console.log("✓ /public/favicon.ico (32×32)");
  console.log("✓ /public/favicon.png (32×32)");
}

// ─── Run ───
await generateOgImage();
await generateAppleTouchIcon();
await generateFavicon();
console.log("\nDone — all brand assets generated.");
