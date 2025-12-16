const axios = require('axios');

const BASE_URL = 'https://www.leaderai.top/mid-api/lab/image_prompt/';
const CATALOG_URL = BASE_URL + 'catalog.json';

const fs = require('fs');

async function inspect() {
    try {
        console.log(`Fetching ${CATALOG_URL}...`);
        const res = await axios.get(CATALOG_URL);
        const log = `Status: ${res.status}\nData: ${JSON.stringify(res.data, null, 2).substring(0, 2000)}`;
        fs.writeFileSync('site_inspect.log', log);
    } catch (error) {
        fs.writeFileSync('site_inspect.log', `Error: ${error.message}`);
    }
}

inspect();
