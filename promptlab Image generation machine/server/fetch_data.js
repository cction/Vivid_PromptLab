const axios = require('axios');
const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/README.md';
const LOCAL_FILE = path.join(__dirname, 'readme_check.md');

async function fetchAndImport() {
    try {
        let data = '';
        if (fs.existsSync(LOCAL_FILE)) {
             console.log(`Reading local file ${LOCAL_FILE}...`);
             data = fs.readFileSync(LOCAL_FILE, 'utf8');
        } else {
            console.log(`Fetching ${URL}...`);
            const res = await axios.get(URL);
            data = res.data;
        }
        console.log(`Fetched ${data.length} bytes.`);
        parseMarkdown(data);
    } catch (e) {
        console.log(`Failed: ${e.message}`);
    }
}

function parseMarkdown(md) {
    const items = [];
    
    // Split into lines to track sections
    const lines = md.split('\n');
    let currentCategory = 'Uncategorized';
    
    // We need to parse statefully to capture category headers
    // Categories are likely H2 headers: "## Category Name"
    // Items start with "### No. X: Title"
    
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect Category (H2)
        // Skip some specific H2 like "Table of Contents", "Statistics", "Featured Prompts"
        if (line.startsWith('## ') && !line.startsWith('### ')) {
            const cat = line.replace('## ', '').trim();
            // Filter out non-content categories
            if (!['View in Web Gallery', 'Table of Contents', 'What is Nano Banana Pro?', 'Statistics', 'How to Contribute', 'License', 'Acknowledgements', 'Star History'].includes(cat)) {
                // Remove emojis if desired, but keeping them might be nice
                // "🔥 Featured Prompts" -> "Featured Prompts"
                currentCategory = cat.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim(); // Remove leading non-word chars (emojis)
            }
        }
        
        // Detect Item Start (H3 No. X)
        if (line.startsWith('### No. ')) {
            // Save previous item if exists
            if (currentItem) {
                items.push(currentItem);
            }
            
            // Start new item
            const title = line.replace(/### No\. \d+:\s*/, '').trim();
            currentItem = {
                title,
                promptEn: '',
                image: '',
                categories: [currentCategory],
                tempLines: [] // Buffer for parsing content
            };
            continue;
        }
        
        // Accumulate lines for current item
        if (currentItem) {
            currentItem.tempLines.push(line);
        }
    }
    
    // Push last item
    if (currentItem) {
        items.push(currentItem);
    }

    // Process each item to extract details
    const finalItems = items.map(item => {
        const content = item.tempLines.join('\n');
        
        // Extract Prompt
        const promptMatch = content.match(/#### 📝 Prompt\s*```([\s\S]*?)```/);
        let promptEn = promptMatch ? promptMatch[1].trim() : '';
        if (!promptEn) {
            // Fallback: try finding text between Prompt header and next header
             const simplePromptMatch = content.match(/#### 📝 Prompt([\s\S]*?)(?:####|$)/);
             if (simplePromptMatch) promptEn = simplePromptMatch[1].trim();
        }
        
        // Clean prompt
        promptEn = promptEn.replace(/```/g, '').trim();
        
        // Extract Image
        // Look for the first image that is not a badge
        const imageMatches = [...content.matchAll(/<img src="(.*?)"/g)];
        let image = '';
        for (const match of imageMatches) {
            const url = match[1];
            if (url && !url.includes('shields.io') && !url.includes('badge')) {
                image = url;
                break;
            }
        }
        if (!image) {
             const mdImageMatches = [...content.matchAll(/!\[.*?\]\((.*?)\)/g)];
             for (const match of mdImageMatches) {
                const url = match[1];
                if (url && !url.includes('shields.io') && !url.includes('badge')) {
                    image = url;
                    break;
                }
            }
        }

        return {
            title: item.title,
            promptEn,
            image,
            categories: item.categories
        };
    }).filter(item => item.promptEn); // Filter out empty prompts
    
    if (finalItems.length > 0) {
        console.log(`Parsed ${finalItems.length} items.`);
        importData(finalItems);
    } else {
        console.log('No items parsed from Markdown.');
    }
}

function importData(externalData) {
    const PRESETS_FILE = path.join(__dirname, 'presets.json');
    let currentPresets = [];
    if (fs.existsSync(PRESETS_FILE)) {
        currentPresets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    }

    const newPresets = externalData.map(item => {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: item.title,
            promptEn: item.promptEn,
            promptZh: '', // No ZH prompt in readme usually, or mixed
            categories: item.categories,
            image: item.image,
            createdAt: new Date().toISOString()
        };
    });

    // Deduplicate by title - BUT UPDATE categories if exists
    const existingMap = new Map();
    currentPresets.forEach(p => existingMap.set(p.title, p));
    
    const finalPresets = [];
    
    // Process new items
    newPresets.forEach(newItem => {
        if (existingMap.has(newItem.title)) {
            // Update existing
            const existing = existingMap.get(newItem.title);
            // Merge categories
            const mergedCats = Array.from(new Set([...(existing.categories || []), ...newItem.categories]));
            // Update fields
            existing.categories = mergedCats;
            // Also update image/prompt if they were empty before
            if (!existing.image) existing.image = newItem.image;
            if (!existing.promptEn) existing.promptEn = newItem.promptEn;
            
            finalPresets.push(existing);
            existingMap.delete(newItem.title); // Mark as processed
        } else {
            // Add new
            finalPresets.push(newItem);
        }
    });
    
    // Add remaining existing items that weren't in the new list
    existingMap.forEach(item => finalPresets.push(item));

    fs.writeFileSync(PRESETS_FILE, JSON.stringify(finalPresets, null, 2));
    console.log(`Updated presets. Total: ${finalPresets.length}`);
}

fetchAndImport();
