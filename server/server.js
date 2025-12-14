const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage
const DATA_FILE = path.join(__dirname, 'presets.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
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

// Get all presets
app.get('/api/presets', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data' });
    try {
      res.json(JSON.parse(data || '[]'));
    } catch (e) {
      res.json([]);
    }
  });
});

// Add new preset
app.post('/api/presets', upload.single('image'), (req, res) => {
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
app.delete('/api/presets/:id', (req, res) => {
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

// Translate API
app.post('/api/translate', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
