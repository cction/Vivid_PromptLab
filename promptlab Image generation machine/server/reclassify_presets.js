const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'presets.json');

// The official main categories in specific order
const MAIN_CATEGORIES = [
    "建筑设计",
    "景观设计",
    "室内设计",
    "规划设计",
    "改造设计",
    "电商设计",
    "创意广告",
    "人物与摄影",
    "插画艺术",
    "创意玩法"
];

// Mappings from old keywords/tags to new Main Categories
// Format: "Keyword": "Main Category"
// We prioritize specific matches first.
const KEYWORD_MAP = {
    // Architecture
    "建筑": "建筑设计",
    "建筑设计与空间": "建筑设计",
    "建筑方案": "建筑设计",
    "建筑展板": "建筑设计",
    "建筑分析图": "建筑设计",
    "建筑摄影与光影": "建筑设计",

    // Landscape
    "景观": "景观设计",
    "景观与环境设计": "景观设计",
    "景观方案": "景观设计",
    "景观分析图": "景观设计",
    "环境": "景观设计",

    // Interior
    "室内": "室内设计",
    "室内设计与家居": "室内设计",
    "室内空间": "室内设计",
    "家居": "室内设计",

    // Planning
    "规划": "规划设计",
    "城市": "规划设计",
    "总平面图": "规划设计",

    // Renovation (Less explicit in current data, might need keyword search in title)
    "改造": "改造设计",
    "翻新": "改造设计",

    // E-commerce
    "电商": "电商设计",
    "产品": "电商设计",
    "商品": "电商设计",
    "产品设计与商业摄影": "电商设计",
    "静物": "电商设计",

    // Advertising
    "广告": "创意广告",
    "海报": "创意广告",
    "排版": "创意广告",
    "Logo": "创意广告",
    "图标": "创意广告",
    "平面": "创意广告",
    "海报设计与排版": "创意广告",
    "Logo设计与图标": "创意广告",

    // People & Photo
    "人物": "人物与摄影",
    "肖像": "人物与摄影",
    "摄影": "人物与摄影",
    "写真": "人物与摄影",
    "模特": "人物与摄影",
    "人物肖像与写实摄影": "人物与摄影",
    "二次元与动漫角色": "人物与摄影", // Maybe Illustration? But "Character" fits here too or Illustration. Let's stick to user list.
    // Wait, "二次元" is usually Illustration. Let's check user list. "插画艺术". 
    // Let's map "二次元" to "插画艺术" if it's anime style.
    // "人物肖像与写实摄影" -> People & Photography.

    // Illustration
    "插画": "插画艺术",
    "动漫": "插画艺术",
    "二次元": "插画艺术",
    "游戏": "插画艺术",
    "概念": "插画艺术",
    "插画与艺术风格": "插画艺术",
    "游戏场景与概念设计": "插画艺术",
    "3D IP": "插画艺术", // 3D characters often fall here or Creative Play
    "3D IP形象设计": "插画艺术",

    // Creative Play
    "创意": "创意玩法",
    "玩法": "创意玩法",
    "艺术字体": "创意玩法",
    "创意与艺术字体": "创意玩法",
    "壁纸": "创意玩法",
    "头像": "创意玩法",
    "表情包": "创意玩法"
};

// Fallback logic for titles
const TITLE_KEYWORDS = [
    { key: "建筑", cat: "建筑设计" },
    { key: "景观", cat: "景观设计" },
    { key: "室内", cat: "室内设计" },
    { key: "规划", cat: "规划设计" },
    { key: "鸟瞰", cat: "建筑设计" }, // Default to Architecture/Planning
    { key: "透视", cat: "建筑设计" },
    { key: "立面", cat: "建筑设计" },
    { key: "剖面", cat: "建筑设计" },
    { key: "电商", cat: "电商设计" },
    { key: "产品", cat: "电商设计" },
    { key: "海报", cat: "创意广告" },
    { key: "Logo", cat: "创意广告" },
    { key: "插画", cat: "插画艺术" },
    { key: "动漫", cat: "插画艺术" },
    { key: "人像", cat: "人物与摄影" },
    { key: "摄影", cat: "人物与摄影" },
    { key: "女孩", cat: "人物与摄影" },
    { key: "男孩", cat: "人物与摄影" },
    { key: "改造", cat: "改造设计" }
];

function classify(preset) {
    let mainCategory = null;
    let subTags = new Set();

    // 1. Check existing categories
    if (preset.categories) {
        for (const cat of preset.categories) {
            // Try exact map
            if (KEYWORD_MAP[cat]) {
                mainCategory = KEYWORD_MAP[cat];
            } else if (MAIN_CATEGORIES.includes(cat)) {
                 mainCategory = cat;
            }
            
            // Collect as subtag if it's not the main category name (unless we need to keep it)
            // We want specific tags like "建筑方案" to remain as subtags.
            // We exclude broad source tags like "LeaderAI", "Nano Banana" from visual tags? 
            // Or keep them as source info? User said "Content's own subdivision label".
            // So "LeaderAI" is source, not content subdivision.
            if (!MAIN_CATEGORIES.includes(cat) && cat !== "LeaderAI" && cat !== "Nano Banana" && cat !== "Featured Prompts") {
                subTags.add(cat);
            }
        }
    }

    // 2. If no main category found, check title/prompts
    if (!mainCategory) {
        const text = (preset.title + " " + preset.promptZh).toLowerCase();
        for (const map of TITLE_KEYWORDS) {
            if (text.includes(map.key.toLowerCase())) {
                mainCategory = map.cat;
                break;
            }
        }
    }

    // 3. Default fallback
    if (!mainCategory) {
        // If it's from LeaderAI and has no specific mapping, look at its original category name in presets.json if possible?
        // We already iterated existing categories. 
        // Let's default to "创意玩法" or "人物与摄影" if it looks like a photo?
        // For safety, let's put "创意玩法" as Misc.
        mainCategory = "创意玩法";
    }
    
    // 4. Construct new categories list: [Main, ...Subs]
    // Filter out the Main Category from SubTags to avoid duplication
    if (subTags.has(mainCategory)) subTags.delete(mainCategory);
    
    // Also map specific sub-categories from LeaderAI to cleaner names if needed?
    // E.g. "01_人物肖像..." -> "人物肖像". 
    // But we already have logic in import_leaderai.js that stripped "01_".
    // Let's just keep existing sub-tags but filter out source tags for the UI later.
    // Wait, script needs to update the JSON file.
    
    // Re-assemble
    return [mainCategory, ...Array.from(subTags)];
}

const presets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let modifiedCount = 0;

const newPresets = presets.map(p => {
    const newCats = classify(p);
    // Only update if changed (simplistic check)
    if (JSON.stringify(newCats) !== JSON.stringify(p.categories)) {
        modifiedCount++;
    }
    return { ...p, categories: newCats };
});

fs.writeFileSync(DATA_FILE, JSON.stringify(newPresets, null, 2));
console.log(`Reclassified ${modifiedCount} presets.`);
