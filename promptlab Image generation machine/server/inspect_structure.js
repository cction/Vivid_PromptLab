const mammoth = require("mammoth");
const cheerio = require("cheerio");
const path = require("path");

const docPath = path.join("E:\\资料及软件\\promptLab\\doc", "Banana pro设计改图智能体保姆级应用指南教程.docx");

mammoth.convertToHtml({path: docPath})
    .then(result => {
        const html = result.value;
        const $ = cheerio.load(html);
        
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            const hasImage = $(el).find('img').length > 0;
            const strong = $(el).find('strong').text().trim();
            
            if (text || hasImage) {
                console.log(`P[${i}]: Text="${text}" Strong="${strong}" HasImage=${hasImage}`);
            }
        });
    })
    .catch(err => console.error(err));
