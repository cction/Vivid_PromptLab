const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_FILE = path.join(__dirname, 'presets.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPresets() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('Failed to parse presets.json:', e.message);
    process.exit(1);
  }
}

function savePresets(presets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(presets, null, 2), 'utf8');
}

function pickPrompt(preset) {
  const zh = (preset.promptZh || '').trim();
  const en = (preset.promptEn || '').trim();
  return zh.length ? zh : en;
}

function buildImageApiUrl(prompt, size = 'square_hd') {
  const encoded = encodeURIComponent(prompt);
  return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=${size}`;
}

async function downloadImage(url, filenameBase) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const buf = Buffer.from(res.data);
  const filename = `${filenameBase}-${Date.now()}.png`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buf);
  return `/uploads/${filename}`;
}

async function main() {
  ensureDir(UPLOADS_DIR);
  const presets = loadPresets();

  let updated = 0;
  let skipped = 0;

  // Limit concurrent downloads to avoid overload
  const concurrency = 3;
  const queue = [];

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];
    const prompt = pickPrompt(preset);
    if (!prompt) {
      skipped++;
      continue;
    }

    // Skip if already has a local uploads image to avoid overriding existing user images
    if (preset.image && String(preset.image).startsWith('/uploads/')) {
      skipped++;
      continue;
    }

    const url = buildImageApiUrl(prompt);
    const nameBase = `banana-${i + 1}`;

    const task = (async () => {
      try {
        const localPath = await downloadImage(url, nameBase);
        preset.image = localPath;
        updated++;
      } catch (err) {
        console.warn('Image generate failed for', preset.title || preset.id, err.message);
        skipped++;
      }
    })();

    queue.push(task);
    if (queue.length >= concurrency) {
      await Promise.all(queue);
      queue.length = 0;
      // Persist periodically to avoid data loss in long runs
      savePresets(presets);
    }
  }

  if (queue.length) {
    await Promise.all(queue);
  }

  savePresets(presets);
  console.log('Generation completed. Updated:', updated, 'Skipped:', skipped);
}

if (require.main === module) {
  main();
}

