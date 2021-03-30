const rq = require("request-promise");
const cheerio = require("cheerio");
const jsdom = require("jsdom");

const fs = require("fs").promises;


const getProvinces = async () => {
    try {
        const data = await rq.get("http://www.sante.gov.dz/garde/garde.php");
    
        const $ = cheerio.load(data);
    
    
        const provinces = [];
        for (let i = 1; i < $("#wilay2").children().length; i++) {
            provinces.push($("#wilay2").children()[i].children[0].data)
        }
    
        return provinces;
        
    } catch (error) {
        throw new Error("in getProvinces")
    }
}


/**
 * 
 * @param {string} wilaya wilaya zip code
 * @returns 
 */
const getTowns = async (wilaya) => {
    try {
        const data = await rq.post("http://www.sante.gov.dz/garde/garde.php", {
            formData: {
                wilay2: wilaya,
                valide: "false",
                wil: "true",
            }
        });

        const $ = cheerio.load(data);

        const towns = $("#insured_list").text().trim().split("\n").map(v => v.trim()).filter(v => v).slice(1);
        return towns;
    } catch (error) {
        throw new Error("in towns",error)
    }
};

/**
 * 
 * @param {string} wilaya 2 degit wilaya code
 * @param {string} townZipCode town zip code
 * @returns 
 */
const getPharms = async (wilaya, townZipCode) => {
    try {
        
        const data = await rq.post("http://www.sante.gov.dz/garde/garde.php", {
            formData: {
                "wilay2": wilaya,
                "valide": "true",
                "wil": "true",
                "options[]": townZipCode
            }
        });
    
        const $ = cheerio.load(data);
    
        const pharms = [];
        const len = $("#insured_list > tbody")[1].children.length - 1;
        for (let i = 0; i < len; i++) {
            const [date, time, _, name, adress] = $($("#insured_list > tbody")[1].children[i].children).text().split("\xa0").map(v => v.trim()).filter(v => v);
            pharms.push({ date, time, name, adress });
        }
        return pharms;
    } catch (error) {
        throw new Error("in pharm",error)
    }
};

const generate = async () => {
    let tree = {};
    const provinces = await getProvinces();
    for (let idx = 39; idx < provinces.length; idx++) {
        tree = JSON.parse(await fs.readFile("./data.json"));
        const name = provinces[idx];
        const index = idx < 10 ? `0${idx+1}` : `${idx+1}`
        const towns = await getTowns(index);
        tree[name] = {};
        for(let j = 0;j < towns.length;j++) {
            const zip = j < 10 ? `${index}0${j+1}` : `${index}${j+1}`
            const pharm = await getPharms(index,zip);
            tree[name][towns[j]] = {pharm};
        }
        console.log(`${name} done! ${idx}`);
        await fs.writeFile("data.json",JSON.stringify(tree));
    }
    await fs.writeFile("data.json",JSON.stringify(tree));
};

console.time("time")
generate().then(() => {
    console.timeEnd("time");
})
