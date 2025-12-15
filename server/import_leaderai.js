const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CATALOG_URL = 'https://www.leaderai.top/mid-api/lab/image_prompt/catalog.json';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'presets.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

async function downloadImage(url) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const ext = path.extname(url).split('?')[0] || '.jpg';
        const filename = `leaderai-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(`/uploads/${filename}`));
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Failed to download image ${url}:`, e.message);
        return null;
    }
}

async function main() {
    console.log("Fetching catalog...");
    const { data: catalog } = await axios.get(CATALOG_URL);
    
    let existing = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            existing = [];
        }
    }
    
    const existingTitles = new Set(existing.map(p => p.title));
    const newPresets = [];
    
    console.log(`Found ${catalog.length} categories.`);
    
    for (const category of catalog) {
        const catName = category.name.replace(/^\d+_/, ''); // Remove "01_" prefix
        console.log(`Processing category: ${catName} (${category.projects.length} items)`);
        
        for (const project of category.projects) {
            if (existingTitles.has(project.title)) {
                process.stdout.write('.');
                continue;
            }
            
            // Skip if no prompt
            if (!project.prompt_origin && !project.prompt_cn) continue;
            
            // Download image (first one)
            let imagePath = "";
            if (project.imgs && project.imgs.length > 0) {
                imagePath = await downloadImage(project.imgs[0]);
            }
            
            const preset = {
                id: project.uuid || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                title: project.title,
                promptEn: project.prompt_origin || "",
                promptZh: project.prompt_cn || "",
                categories: ["LeaderAI", catName],
                image: imagePath || "",
                createdAt: new Date(project.timestamp * 1000).toISOString(),
                author: project.author
            };
            
            newPresets.push(preset);
            process.stdout.write('+');
        }
        console.log('');
    }
    
    console.log(`Importing ${newPresets.length} new items...`);
    
    const final = [...newPresets, ...existing];
    fs.writeFileSync(DATA_FILE, JSON.stringify(final, null, 2));
    console.log("Done!");
}

main().catch(console.error);
