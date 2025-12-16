const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

const TARGET_URL = 'https://www.jianzhuxuezhang.com/ai/banana_modifier/operate';
const DATA_FILE = path.join(__dirname, 'presets.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function readJSON(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try { return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function requiresReference(prompt) {
  if (!prompt) return false;
  const text = String(prompt).toLowerCase();
  return /上传|参考|原图|根据这张图|根据图片|保持.*(面部|人物|身份)|不要改变面部|reference image|input image|根据平面图|根据效果图|将图片/.test(text);
}

function listUploadCandidates() {
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  return files.map(f => path.join(UPLOADS_DIR, f));
}

function pickReferenceFile(candidates, index, categories) {
  if (!candidates.length) return null;
  const isArch = (categories || []).some(c => /建筑|景观|室内|规划|改造/i.test(c));
  const archPref = candidates.filter(f => /\.png$/i.test(f));
  const photoPref = candidates.filter(f => /\.jpe?g$/i.test(f));
  if (isArch && archPref.length) return archPref[index % archPref.length];
  if (!isArch && photoPref.length) return photoPref[index % photoPref.length];
  return candidates[index % candidates.length];
}

async function waitForOutputImage(page) {
  // Try common selectors and network idle; fallback to screenshot
  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 60000 });
  } catch {}

  // Try to find last loaded <img>
  const imgHandle = await page.evaluateHandle(() => {
    const imgs = Array.from(document.querySelectorAll('img')).filter(i => i.naturalWidth && i.naturalHeight);
    return imgs.length ? imgs[imgs.length - 1].src : null;
  });

  const src = await imgHandle.jsonValue();
  if (src && typeof src === 'string') return { type: 'url', src };

  // Try canvas
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
  if (hasCanvas) {
    const dataUrl = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      try { return c.toDataURL('image/png'); } catch { return null; }
    });
    if (dataUrl) return { type: 'data', src: dataUrl };
  }

  // Fallback screenshot of viewport
  const tmpPath = path.join(UPLOADS_DIR, `banana-site-screenshot-${Date.now()}.png`);
  await page.screenshot({ path: tmpPath, fullPage: false });
  return { type: 'file', src: tmpPath };
}

async function downloadToUploads(page, output, baseName) {
  if (output.type === 'url') {
    // Some sites use blob URLs; handle http(s) only
    if (/^https?:\/\//i.test(output.src)) {
      const res = await axios.get(output.src, { responseType: 'arraybuffer' });
      const filename = `${baseName}-${Date.now()}.png`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.data));
      return `/uploads/${filename}`;
    }
    // blob or data url; try to fetch via page
    const dataUrl = await page.evaluate(async (url) => {
      try {
        const blob = await (await fetch(url)).blob();
        const buf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        return `data:${blob.type};base64,${base64}`;
      } catch { return null; }
    }, output.src);
    if (dataUrl) {
      const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      const filename = `${baseName}-${Date.now()}.png`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(m ? m[2] : dataUrl.split(',')[1], 'base64'));
      return `/uploads/${filename}`;
    }
  } else if (output.type === 'data') {
    const m = output.src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const filename = `${baseName}-${Date.now()}.png`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(m ? m[2] : output.src.split(',')[1], 'base64'));
    return `/uploads/${filename}`;
  } else if (output.type === 'file') {
    const filename = `${baseName}-${Date.now()}.png`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.copyFileSync(output.src, filePath);
    return `/uploads/${filename}`;
  }
  return null;
}

async function fillPromptAndGenerate(page, prompt, refFile) {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Try to locate a primary textarea or input for prompt
  await page.waitForSelector('body');
  await page.evaluate((p) => {
    const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"]'));
    let target = candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (target) {
      target.focus();
      if ('value' in target) target.value = p;
      const evt = new Event('input', { bubbles: true });
      target.dispatchEvent(evt);
    }
  }, prompt);

  // Upload reference if required
  if (refFile) {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(refFile);
    }
  }

  // Click a generate/start button
  const btnSelectors = [
    'button',
    'input[type="submit"]',
  ];
  for (const sel of btnSelectors) {
    const buttons = await page.$$(sel);
    for (const b of buttons) {
      const txt = (await page.evaluate(el => el.innerText || el.value || '', b)).trim();
      if (/生成|开始|提交|Generate|Start|运行|Run/i.test(txt)) {
        await b.click();
        break;
      }
    }
  }

  // Wait and collect output
  const output = await waitForOutputImage(page);
  return output;
}

async function main() {
  const presets = readJSON(DATA_FILE);
  const candidates = listUploadCandidates();
  const limit = Number(process.env.LIMIT || '20');
  const overwrite = String(process.env.OVERWRITE || '').trim() === '1';

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'], defaultViewport: null, slowMo: 25 });
  const page = await browser.newPage();

  let processed = 0;
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    if (!overwrite && p.image && String(p.image).startsWith('/uploads/')) continue; // skip unless overwrite
    const prompt = (p.promptZh || p.promptEn || '').trim();
    if (!prompt) continue;

    const needRef = requiresReference(prompt);
    const ref = needRef ? pickReferenceFile(candidates, i, p.categories) : null;

    try {
      const output = await fillPromptAndGenerate(page, prompt, ref);
      const localPath = await downloadToUploads(page, output, `banana-site-${i + 1}`);
      if (localPath) {
        p.image = localPath;
        processed++;
      }
    } catch (err) {
      console.warn('Failed on preset', p.title || p.id, err.message);
    }

    if (processed % 5 === 0) saveJSON(DATA_FILE, presets);
    if (processed >= limit) break;
  }

  saveJSON(DATA_FILE, presets);
  await browser.close();
  console.log('Automation finished. Processed:', processed);
}

if (require.main === module) {
  main();
}

