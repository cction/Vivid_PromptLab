const axios = require('axios');

const url = "https://www.leaderai.top/mid-api/lab/image_prompt/catalog_meta/01_%E4%BA%BA%E7%89%A9%E8%82%96%E5%83%8F%E4%B8%8E%E5%86%99%E5%AE%9E%E6%91%84%E5%BD%B1/%E5%86%B0%E6%99%B6%E5%B9%BB%E5%A2%83%E4%B8%AD%E7%9A%84%E5%AE%9D%E7%9F%B3%E5%B0%91%E5%A5%B3/meta.json";

console.log("Testing URL:", url);

axios.get(url)
    .then(res => {
        console.log("Success!");
        console.log(JSON.stringify(res.data, null, 2));
    })
    .catch(err => {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Status:", err.response.status);
        }
    });
