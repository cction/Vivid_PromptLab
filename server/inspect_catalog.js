const axios = require('axios');

const CATALOG_URL = 'https://www.leaderai.top/mid-api/lab/image_prompt/catalog.json';

async function main() {
    try {
        const { data: catalog } = await axios.get(CATALOG_URL);
        
        console.log("Catalog structure:", Array.isArray(catalog) ? "Array" : typeof catalog);
        
        const cats = Array.isArray(catalog) ? catalog : catalog.catalog;
        
        cats.forEach(cat => {
            console.log(`Category: "${cat.name}"`);
            if (cat.projects && cat.projects.length > 0) {
                console.log(`  First Project: "${cat.projects[0].title}"`);
                console.log(`  Meta Path: "${cat.projects[0].meta_path}"`);
            }
        });
        
    } catch (e) {
        console.error(e.message);
    }
}

main();
