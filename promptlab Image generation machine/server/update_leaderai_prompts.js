const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CATALOG_URL = 'https://www.leaderai.top/mid-api/lab/image_prompt/catalog.json';
const DATA_FILE = path.join(__dirname, 'presets.json');
const LOG_FILE = path.join(__dirname, 'update.log');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    // console.log(msg);
}

async function main() {
    fs.writeFileSync(LOG_FILE, "Starting update...\n");
    log("Loading data...");
    const presets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    log("Fetching catalog...");
    const { data: catalog } = await axios.get(CATALOG_URL);
    
    // Build a map of UUID -> Project for fast lookup
    const projectMap = new Map();
    catalog.forEach(cat => {
        cat.projects.forEach(p => {
            if (p.uuid) {
                projectMap.set(p.uuid, { project: p, categoryName: cat.name });
            }
        });
    });
    
    log(`Catalog loaded. Found ${projectMap.size} projects.`);
    
    let updatedCount = 0;
    
    // Filter LeaderAI presets
    const leaderPresets = presets.filter(p => p.categories && (p.categories.includes("LeaderAI") || p.id.length > 30)); // UUIDs are long
    log(`Found ${leaderPresets.length} LeaderAI presets to check.`);
    
    const BASE_URL = 'https://www.leaderai.top/mid-api/lab/image_prompt/';

    for (let i = 0; i < leaderPresets.length; i++) {
        const preset = leaderPresets[i];
        const item = projectMap.get(preset.id);
        
        if (!item) {
            // log(`Project not found in catalog: ${preset.title} (${preset.id})`);
            continue;
        }

        const { project, categoryName } = item;
        
        // Construct the URL similar to how the website does it
        // catalog_meta/${category}/${title}/meta.json
        const metaUrl = `${BASE_URL}catalog_meta/${encodeURIComponent(categoryName)}/${encodeURIComponent(project.title)}/meta.json`;
        
        // Debug logging for the first item
        if (i === 0) {
            log(`Debug URL: ${metaUrl}`);
        }
        
        try {
            // log(`Fetching meta for [${i+1}/${leaderPresets.length}]: ${preset.title}`);
            const { data: meta } = await axios.get(metaUrl);
            
            let changed = false;
            
            if (meta.prompt_origin && meta.prompt_origin !== preset.promptEn) {
                preset.promptEn = meta.prompt_origin;
                changed = true;
            }
            
            if (meta.prompt_cn && meta.prompt_cn !== preset.promptZh) {
                preset.promptZh = meta.prompt_cn;
                changed = true;
            }
            
            if (changed) {
                updatedCount++;
                if (updatedCount % 10 === 0) log(`Updated ${updatedCount} items...`);
            }
            
        } catch (e) {
            // If the constructed URL fails, try the meta_path if available (though it was failing before)
            if (project.meta_path) {
                 try {
                     const { data: meta } = await axios.get(project.meta_path);
                     let changed = false;
                     if (meta.prompt_origin && meta.prompt_origin !== preset.promptEn) {
                        preset.promptEn = meta.prompt_origin;
                        changed = true;
                     }
                     if (meta.prompt_cn && meta.prompt_cn !== preset.promptZh) {
                        preset.promptZh = meta.prompt_cn;
                        changed = true;
                     }
                     if (changed) {
                        updatedCount++;
                     }
                 } catch (err2) {
                     log(`Failed to fetch meta for ${preset.title} from both URLs: ${e.message} | ${err2.message}`);
                 }
            } else {
                log(`Failed to fetch meta for ${preset.title}: ${e.message}`);
            }
        }
    }
    
    log(`Finished. Updated ${updatedCount} presets.`);
    
    // Save back
    fs.writeFileSync(DATA_FILE, JSON.stringify(presets, null, 2));
    log("Saved presets.json");
}

main().catch(e => log(e.message));

