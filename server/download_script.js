const axios = require('axios');
const fs = require('fs');

async function download() {
    try {
        const res = await axios.get('https://www.leaderai.top/mid-api/lab/image_prompt/script.js');
        fs.writeFileSync('script.js', res.data);
        console.log('Downloaded script.js');
    } catch (e) {
        console.error(e.message);
    }
}

download();
