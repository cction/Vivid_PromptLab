const axios = require('axios');
const fs = require('fs');

async function download() {
    try {
        const res = await axios.get('https://www.leaderai.top/mid-api/lab/image_prompt/index.html');
        fs.writeFileSync('index.html', res.data);
        console.log('Downloaded index.html');
    } catch (e) {
        console.error(e.message);
    }
}

download();
