const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const docPath = path.join("E:\\资料及软件\\promptLab\\doc", "Banana pro设计改图智能体保姆级应用指南教程.docx");

mammoth.convertToHtml({path: docPath})
    .then(result => {
        const html = result.value;
        console.log(html.substring(10000, 15000)); // Inspect next chunk
    })
    .catch(err => console.error(err));
