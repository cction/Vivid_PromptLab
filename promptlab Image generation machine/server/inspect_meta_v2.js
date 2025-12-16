const axios = require('axios');

const META_URL = "https://moban-image-leaderai.oss-cn-hangzhou.aliyuncs.com/catalog_meta/01_人物肖像与写实摄影/冰晶幻境中的宝石少女/meta.json";

async function inspect() {
    try {
        console.log("Fetching...");
        const res = await axios.get(META_URL);
        console.log("Keys:", Object.keys(res.data));
        console.log("Prompt Origin:", res.data.prompt_origin ? res.data.prompt_origin.substring(0, 100) : "N/A");
        console.log("Prompt CN:", res.data.prompt_cn ? res.data.prompt_cn.substring(0, 100) : "N/A");
    } catch (e) {
        console.log("Error:", e.message);
    }
}

inspect();
