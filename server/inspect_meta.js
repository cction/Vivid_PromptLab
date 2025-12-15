const axios = require('axios');

const META_URL = "https://moban-image-leaderai.oss-cn-hangzhou.aliyuncs.com/catalog_meta/01_人物肖像与写实摄影/冰晶幻境中的宝石少女/meta.json";

const fs = require('fs');

async function inspect() {
    try {
        const res = await axios.get(META_URL);
        fs.writeFileSync('meta_inspect.json', JSON.stringify(res.data, null, 2));
        console.log("Done");
    } catch (e) {
        console.error(e.message);
    }
}

inspect();
