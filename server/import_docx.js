const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DOC_PATH = path.join("E:\\资料及软件\\promptLab\\doc", "Banana pro设计改图智能体保姆级应用指南教程.docx");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "presets.json");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

async function convertImage(element) {
    return element.read("base64").then(function(imageBuffer) {
        const buffer = Buffer.from(imageBuffer, 'base64');
        const filename = `imported-${Date.now()}-${Math.random().toString(36).substring(7)}.${element.contentType.split('/')[1]}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        return { src: `/uploads/${filename}` };
    });
}

async function main() {
    console.log("Converting DOCX...");
    const result = await mammoth.convertToHtml({ path: DOC_PATH }, {
        convertImage: mammoth.images.imgElement(convertImage)
    });
    
    const html = result.value;
    const $ = cheerio.load(html);
    const presets = [];
    
    let currentCategory = "建筑"; // Default
    let currentSubCategory = "General";
    
    // We'll collect all meaningful nodes first to process sequentially
    const nodes = [];
    
    $('p').each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const img = $el.find('img').attr('src');
        const isStrong = $el.find('strong').length > 0;
        
        if (img) {
            nodes.push({ type: 'IMAGE', src: img });
        }
        
        if (text) {
            // Check for Categories
            if (text.includes("建筑应用汇总")) {
                nodes.push({ type: 'CATEGORY', value: "建筑" });
                return;
            }
            if (text.includes("景观应用汇总")) {
                nodes.push({ type: 'CATEGORY', value: "景观" });
                return;
            }
            if (text.includes("室内应用汇总")) {
                nodes.push({ type: 'CATEGORY', value: "室内" });
                return;
            }
            
            // Check for SubCategories (e.g., "1.建筑方案")
            if (/^\d+[\.．]/.test(text) && isStrong) {
                nodes.push({ type: 'SUBCAT', value: text });
                return;
            }
            
            // Regular Text
            nodes.push({ type: 'TEXT', value: text });
        }
    });
    
    console.log(`Parsed ${nodes.length} nodes. Processing...`);
    
    let activeCategory = "建筑";
    let activeSubCat = "Uncategorized";
    let pendingImage = null;
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.type === 'CATEGORY') {
            activeCategory = node.value;
            activeSubCat = "Uncategorized"; // Reset subcat on new category
            pendingImage = null;
        } else if (node.type === 'SUBCAT') {
            activeSubCat = node.value;
            pendingImage = null;
        } else if (node.type === 'IMAGE') {
            pendingImage = node.src;
            // Look ahead: if next is TEXT, this image belongs to it.
            // If next is IMAGE or CAT, this image might be orphan or belong to previous (but we process linear).
            // We'll keep it as pending for the next text.
        } else if (node.type === 'TEXT') {
            // It's a prompt
            const promptText = node.value;
            
            // Ignore short noise
            if (promptText.length < 5) continue;
            if (promptText.includes("Banana pro设计")) continue; // Skip title
            
            // Build Title: First 15 chars
            const title = promptText.length > 20 ? promptText.substring(0, 20) + "..." : promptText;
            
            // Determine Categories
            const categories = ["建筑"]; // Base category
            if (activeCategory !== "建筑") categories.push(activeCategory); // Add specific if not base
            if (activeSubCat !== "Uncategorized") categories.push(activeSubCat);
            
            // Use pending image if available, else try to find one nearby?
            // For now, simple logic: Preceding image attaches to text.
            let image = pendingImage;
            
            // If no preceding image, check IMMEDIATE next node
            if (!image && i + 1 < nodes.length && nodes[i+1].type === 'IMAGE') {
                image = nodes[i+1].src;
                // Don't consume it, maybe next text also wants it? 
                // Actually, usually 1 image = 1 prompt. 
                // Let's assume if we use it, we consume it? No, keep simple.
            }

            presets.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                title: title,
                promptEn: "", // No translation yet
                promptZh: promptText,
                categories: categories,
                image: image || "",
                createdAt: new Date().toISOString()
            });
            
            // Clear pending image after use? 
            // If we assume 1-to-1 mapping, yes.
            // If multiple prompts share an image, no.
            // Let's clear it to avoid stale images.
            pendingImage = null;
        }
    }
    
    console.log(`Extracted ${presets.length} presets.`);
    
    // Merge with existing
    let existing = [];
    if (fs.existsSync(DATA_FILE)) {
        existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    
    // Deduplicate by prompt text to avoid re-importing same stuff
    const existingPrompts = new Set(existing.map(p => p.promptZh));
    const newPresets = presets.filter(p => !existingPrompts.has(p.promptZh));
    
    const final = [...newPresets, ...existing];
    fs.writeFileSync(DATA_FILE, JSON.stringify(final, null, 2));
    console.log(`Imported ${newPresets.length} new items. Total: ${final.length}`);
}

main().catch(console.error);
