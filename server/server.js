const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Serve uploads folder. IMPORTANT: If images are missing, check if this folder exists and contains images.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage
const DATA_FILE = path.join(__dirname, 'presets.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ pinnedTags: [] }));
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev-secret';

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}
function writeSettings(obj) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null, 2));
}
function makeHash(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, s, 32).toString('hex');
  return { hash: key, salt: s };
}
function verifyHash(password, hash, salt) {
  const key = crypto.scryptSync(password, salt, 32).toString('hex');
  return key === hash;
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signToken(payload, ttlSec = 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = { ...payload, exp };
  const h = b64url(header);
  const p = b64url(body);
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;
  next();
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const settings = readSettings();
  if (settings.admin && settings.admin.username && settings.admin.hash && settings.admin.salt) {
    const okUser = username === settings.admin.username;
    const okPass = verifyHash(password, settings.admin.hash, settings.admin.salt);
    if (!okUser || !okPass) return res.status(401).json({ error: 'Invalid credentials' });
  } else {
    if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ role: 'admin', username });
  res.json({ token, user: { username } });
});
app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: { username: payload.username } });
});

// Update admin password/username
app.post('/api/admin/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing parameters' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  const settings = readSettings();
  let currentOk = false;
  if (settings.admin && settings.admin.username && settings.admin.hash && settings.admin.salt) {
    currentOk = verifyHash(currentPassword, settings.admin.hash, settings.admin.salt);
  } else {
    currentOk = currentPassword === ADMIN_PASS;
  }
  if (!currentOk) return res.status(401).json({ error: 'Invalid current password' });
  const { hash, salt } = makeHash(newPassword);
  settings.admin = {
    username: typeof newUsername === 'string' && newUsername.trim() ? newUsername.trim() : (settings.admin?.username || ADMIN_USER),
    hash,
    salt
  };
  writeSettings(settings);
  res.json({ success: true, username: settings.admin.username });
});

// Get all presets
app.get('/api/presets', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });

    let presets = [];
    try {
      presets = JSON.parse(data || '[]');
    } catch (e) {
      return res.json([]);
    }

    const page = parseInt(req.query.page, 10);
    const pageSize = parseInt(req.query.pageSize, 10);
    const usePagination = Number.isInteger(page) && page > 0 && Number.isInteger(pageSize) && pageSize > 0;

    const sortMode = typeof req.query.sortMode === 'string' ? req.query.sortMode : null;

    let filteredPresets = presets;
    const category = req.query.category;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (category && category !== 'All') {
      filteredPresets = filteredPresets.filter(preset =>
        Array.isArray(preset.categories) && preset.categories.includes(category)
      );
    }

    if (q) {
      const keyword = q.toLowerCase();
      filteredPresets = filteredPresets.filter(preset => {
        const title = (preset.title || '').toLowerCase();
        const promptEn = (preset.promptEn || '').toLowerCase();
        const promptZh = (preset.promptZh || '').toLowerCase();
        return title.includes(keyword) || promptEn.includes(keyword) || promptZh.includes(keyword);
      });
    }

    const byDateDesc = (a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0);
      const db = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0);
      return db - da;
    };

    if (sortMode === 'latest') {
      filteredPresets = filteredPresets.slice().sort(byDateDesc);
    } else if (sortMode === 'pinned_first') {
      const settings = readSettings();
      const pinnedTags = Array.isArray(settings.pinnedTags) ? settings.pinnedTags : [];
      if (pinnedTags.length > 0) {
        const seen = new Set();
        const pinnedOrdered = [];
        pinnedTags.forEach(tag => {
          const group = filteredPresets
            .filter(p => !seen.has(p.id) && Array.isArray(p.categories) && p.categories.includes(tag))
            .sort(byDateDesc);
          group.forEach(p => {
            seen.add(p.id);
            pinnedOrdered.push(p);
          });
        });
        const remaining = filteredPresets
          .filter(p => !seen.has(p.id))
          .sort(byDateDesc);
        filteredPresets = [...pinnedOrdered, ...remaining];
      } else {
        filteredPresets = filteredPresets.slice().sort(byDateDesc);
      }
    }

    if (!usePagination) {
      return res.json(filteredPresets);
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedPresets = filteredPresets.slice(startIndex, endIndex);

    const categoryCounts = {};
    presets.forEach(preset => {
      if (Array.isArray(preset.categories)) {
        preset.categories.forEach(cat => {
          if (typeof cat === 'string') {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }
        });
      }
    });

    return res.json({
      presets: pagedPresets,
      total: filteredPresets.length,
      categoryCounts
    });
  });
});

// Add new preset
app.post('/api/presets', requireAuth, upload.single('image'), (req, res) => {
  let { title, promptEn, promptZh, categories } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // Handle categories parsing if it comes as string (FormData often sends arrays as separate entries or need JSON parsing)
  if (typeof categories === 'string') {
      try {
          categories = JSON.parse(categories);
      } catch (e) {
          categories = [categories];
      }
  }

  const newPreset = {
    id: Date.now().toString(),
    title,
    promptEn,
    promptZh,
    categories: Array.isArray(categories) ? categories : [],
    image: imagePath,
    createdAt: new Date().toISOString()
  };

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    let presets = [];
    if (!err && data) {
      try {
        presets = JSON.parse(data);
      } catch (e) {}
    }
    presets.unshift(newPreset); // Add to top
    
    fs.writeFile(DATA_FILE, JSON.stringify(presets, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save data' });
      res.json(newPreset);
    });
  });
});

// Delete preset
app.delete('/api/presets/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    
    let presets = [];
    try {
      presets = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: 'Data corrupted' });
    }

    const presetToDelete = presets.find(p => p.id === id);
    if (!presetToDelete) return res.status(404).json({ error: 'Preset not found' });

    // Filter out the preset
    const newPresets = presets.filter(p => p.id !== id);

    // Delete associated image if exists
    if (presetToDelete.image) {
      const imagePath = path.join(__dirname, presetToDelete.image);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Failed to delete image:', err);
        });
      }
    }

    fs.writeFile(DATA_FILE, JSON.stringify(newPresets, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save data' });
      res.json({ success: true });
    });
  });
});

// Update preset (PUT)
app.put('/api/presets/:id', requireAuth, upload.single('image'), (req, res) => {
  const { id } = req.params;
  let { title, promptEn, promptZh, categories } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

  // Handle categories
  if (typeof categories === 'string') {
    try {
      categories = JSON.parse(categories);
    } catch (e) {
      categories = [categories];
    }
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    let presets = [];
    try { presets = JSON.parse(data); } catch (e) { return res.status(500).json({ error: 'Data corrupted' }); }

    const idx = presets.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Preset not found' });

    // Update fields
    const updatedPreset = { ...presets[idx] };
    if (title !== undefined) updatedPreset.title = title;
    if (promptEn !== undefined) updatedPreset.promptEn = promptEn;
    if (promptZh !== undefined) updatedPreset.promptZh = promptZh;
    if (categories !== undefined) updatedPreset.categories = Array.isArray(categories) ? categories : [];
    
    // Update image if new one provided
    if (imagePath) {
      // Delete old image if it was local
      if (updatedPreset.image && updatedPreset.image.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, updatedPreset.image);
        if (fs.existsSync(oldPath)) {
          fs.unlink(oldPath, () => {});
        }
      }
      updatedPreset.image = imagePath;
    }

    presets[idx] = updatedPreset;

    fs.writeFile(DATA_FILE, JSON.stringify(presets, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save data' });
      res.json(updatedPreset);
    });
  });
});

// Translate API
app.post('/api/translate', requireAuth, async (req, res) => {
  const { text, source, target } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: text,
        langpair: `${source}|${target}`
      }
    });

    if (response.data && response.data.responseData) {
      res.json({ translatedText: response.data.responseData.translatedText });
    } else {
      res.status(500).json({ error: 'Translation failed' });
    }
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({ error: 'Translation service error' });
  }
});

// --- Tag Management APIs ---

// Get pinned tags
app.get('/api/settings', (req, res) => {
  fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read settings' });
    try {
      res.json(JSON.parse(data || '{}'));
    } catch (e) {
      res.json({});
    }
  });
});

// Toggle pin status for a tag
app.post('/api/tags/pin', requireAuth, (req, res) => {
  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: 'No tag provided' });

  fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
    let settings = { pinnedTags: [] };
    if (!err && data) {
      try { settings = JSON.parse(data); } catch (e) {}
    }
    
    if (!settings.pinnedTags) settings.pinnedTags = [];
    
    if (settings.pinnedTags.includes(tag)) {
      settings.pinnedTags = settings.pinnedTags.filter(t => t !== tag);
    } else {
      settings.pinnedTags.push(tag);
    }

    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save settings' });
      res.json({ success: true, pinnedTags: settings.pinnedTags });
    });
  });
});

// Create new tag (empty usage)
app.post('/api/tags', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tag name required' });
  
  // Since tags are derived from presets, we can't really "create" an empty tag without attaching it to something
  // OR we need to maintain a separate tags list.
  // BUT, to keep it simple and consistent with current architecture (derived tags):
  // We can create a dummy preset or just acknowledge it. 
  // However, the user probably wants it to appear in the list.
  // A better approach for this architecture is to just return success, 
  // and frontend can optimistically add it to the list until it's used.
  // OR, we can update settings.json to store "known tags" even if unused.
  
  // Let's implement "known tags" in settings to support unused tags
  fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
    let settings = { pinnedTags: [], customTags: [] };
    if (!err && data) {
      try { settings = JSON.parse(data); } catch (e) {}
    }
    
    if (!settings.customTags) settings.customTags = [];
    if (!settings.customTags.includes(name)) {
      settings.customTags.push(name);
    }
    
    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save' });
      res.json({ success: true, name });
    });
  });
});

// Get all tags with counts (updated to include custom empty tags)
app.get('/api/tags', (req, res) => {
  const p1 = new Promise((resolve) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      try { resolve(JSON.parse(data || '[]')); } catch (e) { resolve([]); }
    });
  });
  
  const p2 = new Promise((resolve) => {
    fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
    });
  });

  Promise.all([p1, p2]).then(([presets, settings]) => {
    const tagCounts = {};
    
    // Count from presets
    presets.forEach(p => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach(cat => {
          if (cat) tagCounts[cat] = (tagCounts[cat] || 0) + 1;
        });
      }
    });

    // Add custom tags with 0 count if not present
    if (settings.customTags) {
      settings.customTags.forEach(t => {
        if (!tagCounts[t]) tagCounts[t] = 0;
      });
    }

    // Convert to array
    const tags = Object.keys(tagCounts).map(name => ({
      name,
      count: tagCounts[name]
    })).sort((a, b) => b.count - a.count);

    res.json(tags);
  });
});

// Batch update tags (Rename/Merge/Delete)
app.post('/api/tags/batch', requireAuth, (req, res) => {
  const { oldNames, newName } = req.body; // oldNames: string[], newName: string | null
  
  if (!Array.isArray(oldNames) || oldNames.length === 0) {
    return res.status(400).json({ error: 'No tags selected' });
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    let presets = [];
    try { presets = JSON.parse(data || '[]'); } catch (e) {}

    let updatedCount = 0;
    const targets = new Set(oldNames);

    presets.forEach(p => {
      if (!Array.isArray(p.categories)) return;
      
      const originalLen = p.categories.length;
      let newCats = new Set(p.categories);
      let changed = false;

      // Check if this preset has any of the target tags
      const hasTarget = p.categories.some(c => targets.has(c));
      if (!hasTarget) return;

      // Remove old tags
      oldNames.forEach(old => newCats.delete(old));
      
      // Add new tag if provided (Rename/Merge)
      if (newName) {
        newCats.add(newName);
      }

      // If set size changed or we know we did something (for pure rename A->B where A was there)
      // Actually simpler: construct new array
      p.categories = Array.from(newCats);
      updatedCount++;
    });

    if (updatedCount > 0) {
      fs.writeFile(DATA_FILE, JSON.stringify(presets, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save data' });
        
        // Also cleanup settings.json (pinnedTags and customTags)
        fs.readFile(SETTINGS_FILE, 'utf8', (err2, data2) => {
            if (!err2) {
                let settings = { pinnedTags: [], customTags: [] };
                try { settings = JSON.parse(data2); } catch(e) {}
                let settingsChanged = false;

                // Remove deleted tags from pinnedTags
                if (settings.pinnedTags) {
                    const originalLen = settings.pinnedTags.length;
                    settings.pinnedTags = settings.pinnedTags.filter(t => !targets.has(t));
                    if (newName && settings.pinnedTags.length < originalLen) {
                         // If merged, we might want to pin the new name if the old one was pinned?
                         // For simplicity, just unpin deleted ones.
                    }
                    if (settings.pinnedTags.length !== originalLen) settingsChanged = true;
                }

                // Remove deleted tags from customTags
                if (settings.customTags) {
                    const originalLen = settings.customTags.length;
                    settings.customTags = settings.customTags.filter(t => !targets.has(t));
                    if (settings.customTags.length !== originalLen) settingsChanged = true;
                }

                if (settingsChanged) {
                    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), () => {});
                }
            }
        });

        res.json({ success: true, updatedPresets: updatedCount });
      });
    } else {
      // Even if no presets were updated (unused tag), we still need to delete it from customTags/pinnedTags
        fs.readFile(SETTINGS_FILE, 'utf8', (err2, data2) => {
            if (!err2) {
                let settings = { pinnedTags: [], customTags: [] };
                try { settings = JSON.parse(data2); } catch(e) {}
                let settingsChanged = false;

                if (settings.pinnedTags) {
                    const originalLen = settings.pinnedTags.length;
                    settings.pinnedTags = settings.pinnedTags.filter(t => !targets.has(t));
                    if (settings.pinnedTags.length !== originalLen) settingsChanged = true;
                }

                if (settings.customTags) {
                    const originalLen = settings.customTags.length;
                    settings.customTags = settings.customTags.filter(t => !targets.has(t));
                    if (settings.customTags.length !== originalLen) settingsChanged = true;
                }

                if (settingsChanged) {
                    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err3) => {
                        if (err3) return res.status(500).json({ error: 'Failed to save settings' });
                        res.json({ success: true, updatedPresets: 0 });
                    });
                } else {
                    res.json({ success: true, updatedPresets: 0 });
                }
            } else {
                res.json({ success: true, updatedPresets: 0 });
            }
        });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
