const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const STYLES_FILE = path.join(ROOT_DIR, '..', 'styles', 'banana_prompts.txt');
const DATA_FILE = path.join(ROOT_DIR, 'presets.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error('Failed to read file:', file, e.message);
    process.exit(1);
  }
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function slugify(text) {
  return String(text || '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .slice(0, 24) || 'item';
}

function extractSections(raw) {
  const lines = raw.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const cleaned = line.replace(/^<a id="[^"]+"><\/a>/, '').trim();
    const m = cleaned.match(/^__(.+应用汇总)__$/);
    if (m) {
      if (current) sections.push(current);
      current = {
        name: m[1],
        start: i,
        blocks: []
      };
      continue;
    }
    if (!current) continue;
  }
  if (current) sections.push(current);
  return { sections, lines };
}

function categoryTagFromName(name) {
  if (name.includes('建筑')) return '建筑';
  if (name.includes('景观')) return '景观';
  if (name.includes('室内')) return '室内';
  return '建筑';
}

function extractPromptsFromSection(section, allLines) {
  const prompts = [];
  const startIndex = section.start + 1;
  let current = null;
  let prevWasBlank = false;

  for (let i = startIndex; i < allLines.length; i++) {
    const rawLine = allLines[i];
    const line = rawLine.trim();
    const cleaned = line.replace(/^<a id="[^"]+"><\/a>/, '').trim();

    if (!cleaned) {
      prevWasBlank = true;
      continue;
    }

    if (/^__.+应用汇总__$/.test(cleaned)) break;

    const numMatch = cleaned.match(/^(\d+)[\\\.．、]+\s*(.+)$/);
    if (numMatch) {
      if (current) prompts.push(current);
      current = {
        index: Number(numMatch[1]),
        promptZh: numMatch[2].trim(),
        images: []
      };
      prevWasBlank = false;
      continue;
    }

    const directPrompt = cleaned.match(/^((根据这张图|根据图片).+|将图片.+)$/);
    if (directPrompt) {
      if (current) prompts.push(current);
      current = {
        index: prompts.length + 1,
        promptZh: directPrompt[1].trim(),
        images: []
      };
      prevWasBlank = false;
      continue;
    }

    const imgMatch = rawLine.match(/!\[\]\((data:image\/[a-zA-Z0-9+\/;=,:]+)\)/);
    if (imgMatch && current) {
      current.images.push(imgMatch[1]);
      prevWasBlank = false;
      continue;
    }

    if (!/^__.+__$/ .test(cleaned)) {
      if (prevWasBlank || !current) {
        if (current) prompts.push(current);
        current = {
          index: prompts.length + 1,
          promptZh: cleaned,
          images: []
        };
      } else {
        current.promptZh += ' ' + cleaned;
      }
      prevWasBlank = false;
    }
  }

  if (current) prompts.push(current);
  return prompts;
}

function saveImageData(dataUrl, categoryKey, idx) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const base64 = m[2];
  let ext = '.png';
  if (mime === 'image/webp') ext = '.webp';
  else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';

  const filename = `banana-${categoryKey}-${idx}-${Date.now()}` + ext;
  const filePath = path.join(UPLOADS_DIR, filename);
  const buf = Buffer.from(base64, 'base64');
  fs.writeFileSync(filePath, buf);
  return '/uploads/' + filename;
}

function buildTitle(promptZh, sectionName, index) {
  const base = String(promptZh || '').replace(/^[0-9]+\./, '').trim();
  if (!base) return `${sectionName}-${index}`;
  if (base.length <= 20) return base;
  return base.slice(0, 20);
}

function main() {
  console.log('Reading banana_prompts.txt...');
  const raw = safeRead(STYLES_FILE);
  const { sections, lines } = extractSections(raw);

  if (!sections.length) {
    console.error('No 应用汇总 sections found in banana_prompts.txt');
    process.exit(1);
  }

  ensureUploadsDir();

  console.log('Found sections:', sections.map(s => s.name));

  const bananaPresets = [];

  sections.forEach((section) => {
    const tag = categoryTagFromName(section.name);
    const categoryKey = tag === '景观' ? 'land' : tag === '室内' ? 'interior' : 'arch';
    const prompts = extractPromptsFromSection(section, lines);

    console.log(`Section ${section.name}: ${prompts.length} prompts`);

    prompts.forEach((p, idx) => {
      const seq = idx + 1;
      const id = `banana-${categoryKey}-${seq}`;
      const title = buildTitle(p.promptZh, section.name, seq);
      const image = p.images.length ? saveImageData(p.images[0], categoryKey, seq) : null;

      bananaPresets.push({
        id,
        title,
        promptEn: "",
        promptZh: p.promptZh,
        category: "Architecture",
        tags: [tag, section.name, "BananaPro"],
        image,
        source: {
          name: "Banana Pro 文档",
          url: "https://qyxznlkmwx.feishu.cn/wiki/FaGow1c69if8PGkYI28ccWeBnTg"
        },
        model: "Nano Banana Pro",
        createdAt: new Date().toISOString()
      });
    });
  });

  console.log('Total banana presets extracted:', bananaPresets.length);

  console.log('Reading existing presets.json...');
  const rawData = safeRead(DATA_FILE);
  let data;
  try {
    data = JSON.parse(rawData || '[]');
  } catch (e) {
    console.error('Failed to parse presets.json:', e.message);
    process.exit(1);
  }

  const filtered = data.filter(p => !(String(p.id || '').startsWith('banana-')));
  const merged = [...bananaPresets, ...filtered];

  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
  console.log('presets.json updated successfully.');
}

if (require.main === module) {
  main();
}
