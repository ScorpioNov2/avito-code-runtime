// Tải toolchain WebAssembly (clang/lld cho C/C++, Miri cho Rust, javac+TeaVM cho Java) về public/wasm/ để tự host.
// Dùng:  npm run fetch-wasm            (tải tất cả)
//        npm run fetch-wasm -- clang   (chỉ C/C++)
//        npm run fetch-wasm -- rust    (chỉ Rust)
//        npm run fetch-wasm -- java    (chỉ Java)
// File đã có và đúng checksum sẽ được bỏ qua. Phiên bản được ghim bằng commit SHA trong manifest.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputRoot = join(scriptDir, '..', 'public', 'wasm');
const { assets } = JSON.parse(readFileSync(join(scriptDir, 'wasm-assets.manifest.json'), 'utf8'));
const requestedGroup = process.argv[2];
const selectedAssets = requestedGroup ? assets.filter((asset) => asset.group === requestedGroup) : assets;

if (selectedAssets.length === 0) {
  console.error(`Unknown group "${requestedGroup}". Use: clang | rust | java`);
  process.exit(1);
}

async function sha256Of(filePath) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

async function isAlreadyDownloaded(asset, destination) {
  return existsSync(destination) && statSync(destination).size === asset.size && (await sha256Of(destination)) === asset.sha256;
}

async function download(asset) {
  const destination = join(outputRoot, asset.dest);
  if (await isAlreadyDownloaded(asset, destination)) {
    console.log(`  skip   ${asset.dest}`);
    return;
  }

  mkdirSync(dirname(destination), { recursive: true });
  const response = await fetch(asset.url);
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} for ${asset.url}`);

  const partialPath = `${destination}.part`;
  const source = Readable.fromWeb(response.body);
  await pipeline(...(asset.gzip ? [source, createGunzip()] : [source]), createWriteStream(partialPath));

  const actualHash = await sha256Of(partialPath);
  if (actualHash !== asset.sha256) {
    rmSync(partialPath, { force: true });
    throw new Error(`Checksum mismatch for ${asset.dest}\n  expected ${asset.sha256}\n  actual   ${actualHash}`);
  }
  renameSync(partialPath, destination);
  console.log(`  ok     ${asset.dest} (${(asset.size / 1e6).toFixed(1)} MB)`);
}

const totalMb = selectedAssets.reduce((sum, asset) => sum + asset.size, 0) / 1e6;
console.log(`Fetching ${selectedAssets.length} files (~${totalMb.toFixed(0)} MB unpacked) into public/wasm/`);
for (const asset of selectedAssets) await download(asset);
console.log('Done.');
