const axios = require('axios');

const rawUrl = "https://moban-image-leaderai.oss-cn-hangzhou.aliyuncs.com/catalog_meta/01_人物肖像与写实摄影/冰晶幻境中的宝石少女/meta.json";
const encodedUrl = encodeURI(rawUrl);

console.log("Raw:", rawUrl);
console.log("Encoded:", encodedUrl);

const fs = require('fs');

const imgUrl = "https://moban-image-leaderai.oss-cn-hangzhou.aliyuncs.com/catalog/01_人物肖像与写实摄影/冰晶幻境中的宝石少女/预览图.jpg";
const altMetaUrl1 = "https://moban-image-leaderai.oss-cn-hangzhou.aliyuncs.com/catalog/01_人物肖像与写实摄影/冰晶幻境中的宝石少女/meta.json";
const encodedAlt1 = encodeURI(altMetaUrl1);

async function main() {
    let log = "";
    const append = (msg) => log += msg + "\n";
    
    // await test(rawUrl, "Meta Raw", append);
    // await test(encodedUrl, "Meta Encoded", append);
    // await test(imgUrl, "Img Raw", append);
    await test(altMetaUrl1, "Alt1 Raw", append);
    await test(encodedAlt1, "Alt1 Encoded", append);
    
    fs.writeFileSync('test_encode.log', log);
}

async function test(url, label, log) {
    try {
        const res = await axios.get(url, {
            headers: {
                'Referer': 'https://www.leaderai.top/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        log(`${label} Success: ${res.status}`);
    } catch (e) {
        log(`${label} Failed: ${e.message}`);
    }
}

main();
