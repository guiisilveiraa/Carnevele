const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const source = path.join(projectRoot, "assets", "media", "017a455cc7ac.webp");
const iconsDir = path.join(projectRoot, "assets", "icons");

async function squarePng(size, background) {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      background,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function pngIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(bytes.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
  });
  return Buffer.concat([header, ...images.map(({ bytes }) => bytes)]);
}

async function main() {
  await fs.mkdir(iconsDir, { recursive: true });
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  const png16 = await squarePng(16, transparent);
  const png32 = await squarePng(32, transparent);

  await Promise.all([
    fs.writeFile(path.join(iconsDir, "favicon-16x16.png"), png16),
    fs.writeFile(path.join(iconsDir, "favicon-32x32.png"), png32),
    fs.writeFile(path.join(iconsDir, "apple-touch-icon.png"), await squarePng(180, white)),
    fs.writeFile(path.join(iconsDir, "icon-192.png"), await squarePng(192, white)),
    fs.writeFile(path.join(iconsDir, "icon-512.png"), await squarePng(512, white)),
    fs.writeFile(path.join(projectRoot, "favicon.ico"), pngIco([
      { size: 16, bytes: png16 },
      { size: 32, bytes: png32 },
    ])),
  ]);

  console.log("Created browser, Apple and installable icons from the current CARNEVELE mark.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
