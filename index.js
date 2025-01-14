// External
import axios from 'axios';
import csv from 'csvtojson';
import fs from 'fs';
import { dirname } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { HeaderGenerator } from 'header-generator';

// Local
import { sleep, generateHeaders } from './utils.js';
import { base_url, base_url_img, version, platformMap, excludePlatforms, batch, delay } from './config.js';

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const headerGenerator = new HeaderGenerator({
    browsers: [
        { name: "chrome", minVersion: 100 },
        { name: "firefox", minVersion: 100 },
        { name: "safari", minVersion: 14 }
    ],
    devices: [
        "desktop"
    ],
    operatingSystems: [
        "windows",
        "macos",
        "linux"
    ]
});

// Main

// Fetch data from the URL and convert CSV to JSON
export async function fetchData(forced = 3, forcedGap = 15, maximum = Infinity) {
    try {
        // Fetch
        const headers = headerGenerator.getHeaders(generateHeaders('csv'));
        const url = `${base_url}/Views/Locale/Content/Microsites/trade-value-lookup/data/Trade_Values.csv?${version}`;
        const response = await axios.get(url, {
            headers,
            referrer: `${base_url}/Views/Locale/Content/Microsites/trade-value-lookup/index.html`,
            referrerPolicy: "strict-origin-when-cross-origin",
            method: "GET",
            mode: "cors",
            credentials: "include"
        });

        // Process
        const json = await csv().fromString(response.data);
        let formattedJson = json.map(item => {
            const formattedItem = {};
            for (const key in item) {
                const newKey = key.toLowerCase().replace(/ /g, '_');
                formattedItem[newKey] = item[key];
            }

            formattedItem.sku = parseInt(formattedItem.sku);
            formattedItem.name = formattedItem.item_description
                .replace(/ (NSW|PS4|PS5|XBOX|XBX|XB1|XBO|XB|PS|P|N|X)$/, '')?.trim();
            delete formattedItem.item_description;

            formattedItem.price = parseFloat(formattedItem.values.replace('$', '')); // Convert values to float
            const platformName = platformMap[formattedItem.platform] || formattedItem.platform;
            formattedItem.link = null;
            formattedItem.productId = null;
            formattedItem.img = null;
            return formattedItem;
        }).filter(item =>
            !excludePlatforms.includes(platformMap[item.platform] || item.platform) &&
            !item.name.toLowerCase().includes(" console") &&
            !item.name.toLowerCase().includes(" controller")
        );
        console.log("Found " + formattedJson.length + " products. Applying filters..");

        // Slice
        if (maximum) {
            formattedJson = formattedJson.slice(0, maximum);
        }

        // Product ID lookup
        if (formattedJson.length) {
            formattedJson = await processInBatches(formattedJson, batch, delay, forced, forcedGap);
        }
        console.log(formattedJson.length + " remaining.");

        // End
        formattedJson = formattedJson.map(item => ({
            name: item.name,
            platform: item.platform,
            sku: item.sku,
            productId: item.productId,
            price: item.price,
            link: item.link,
            img: item.img,
        }));
        return formattedJson;
    } catch (error) {
        console.error('Error fetching products:', error.message);
        throw error;
    }
}

// Fetch and save promotions
export async function fetchPromotions() {
    try {
        const headers = headerGenerator.getHeaders(generateHeaders('html'));
        const url = `${base_url}/playdoffers/Index`;
        const response = await axios.get(url, {
            headers,
            referrerPolicy: "strict-origin-when-cross-origin",
            method: "GET",
            mode: "cors",
            credentials: "include"
        });

        if (!response.data) {
            throw new Error('No data found');
        }

        const $ = cheerio.load(response.data);
        const offers = [];

        $('.grid-parent').each((index, section) => {
            const imgElement = $(section).find('.greyBox img');
            const detailsElement = $(section).find('.details');

            if (imgElement.length && detailsElement.length) {
                const title = detailsElement.find('h3 strong').text().trim();

                var type = null;
                if (title.includes("Save ")) {
                    type = "save";
                } else if (title.includes("towards ")) {
                    type = "trade";
                }

                var discount = null;
                if (type == "trade") {
                    const discountMatch = title.match(/(\d+)% extra/);
                    if (discountMatch) {
                        discount = parseInt(discountMatch[1], 10);
                    }
                }
                var discount_platforms = [];
                if (type == "trade") {
                    const finePrint = detailsElement.find('.fineprint').text();
                    const platformRegex = /(PS5|Playstation 5|PS4|Playstation 4|XBox Series X|XBox Series S|Xbox One|Nintendo Switch|Switch)/gi;
                    let match;
                    while ((match = platformRegex.exec(finePrint)) !== null) {
                        const originalPlatform = match[0];
                        const platform = originalPlatform.toLowerCase().replace(/ /g, '');
                        const excludeRegex = new RegExp(`exclude.*${platform}.*\\.|\\.${platform}.*exclude`, 'i');
                        if (!excludeRegex.test(finePrint)) {
                            discount_platforms.push(originalPlatform);
                        }
                    }
                }

                var image = null;
                if (imgElement.attr('src')) {
                    image = "https:" + imgElement.attr('src');
                }
                var run_dates = null;
                if (detailsElement.find('h6 strong')?.text().trim()) {
                    run_dates = detailsElement.find('h6 strong')?.text().trim().replace("Run Dates: ", "");
                }
                const offer = {
                    title,
                    type,
                    discount,
                    discount_platforms,
                    image,
                    run_dates,
                    in_store_only: detailsElement.find('.fineprint')?.text().includes('store only'),
                    fineprint: detailsElement.find('.fineprint')?.text().trim().replaceAll("  ", " "),
                    link: detailsElement.find('h4 a').attr('href') || null
                };
                offers.push(offer);
            }
        });

        console.log("Found " + offers.length + " promotions.");
        return offers;
    } catch (error) {
        console.error('Error fetching promotions:', error.message);
        throw error;
    }
}

// Save JSON data to a file with the current date
export async function saveData(json, type = 'trade_values', minify = false) {
    try {
        const date = new Date().toISOString().split('T')[0];
        json = {
            date,
            count: json?.length || null,
            data: json
        };

        const folderPath = path.join(path.resolve(), 'data');
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        const extension = minify ? '.min.json' : '.json';
        const filePath = path.join(folderPath, `${type}_${date}${extension}`);
        fs.writeFileSync(filePath, JSON.stringify(json, null, minify ? 0 : 2));
        fs.writeFileSync(path.join(folderPath, `${type}_latest${extension}`), JSON.stringify(json, null, minify ? 0 : 2));
    } catch (error) {
        console.error('Error saving data:', error.message);
        throw error;
    }
}

// Fetch and save trade values
export async function fetchAndSavePromotions(minify = false) {
    try {
        const offers = await fetchPromotions();
        await saveData(offers, 'promotions', minify);
    } catch (error) {
        console.error('Error saving promotions:', error.message);
        throw error;
    }
}

// Search data by SKU or description
export function searchData(json, query) {
    return json.filter(item =>
        item.sku.toString().includes(query) || item.name.toLowerCase().includes(query.toLowerCase())
    );
}

// Filter data by platform and values
export function filterData(json, platform, minValue, maxValue) {
    return json.filter(item =>
        (!platform || item.platform === platform) &&
        (!minValue || item.price >= minValue) &&
        (!maxValue || item.price <= maxValue)
    );
}

// Fetch product ID by SKU
export async function searchProductId(sku) {
    try {
        const headers = headerGenerator.getHeaders(generateHeaders('json'));
        const response = await axios.get(`${base_url}/QuickSearch/LoadAutocomplete?term=${sku}`, {
            headers,
            referrer: `${base_url}/Home/Index`,
            referrerPolicy: "strict-origin-when-cross-origin",
            method: "GET",
            mode: "cors",
            credentials: "include"
        });

        const data = response.data;
        if (data.length > 0 && data[0].productsId.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Error searching product ID:', error.message);
        return null;
    }
}

// Parallel processing for product ID lookup
export async function processInBatches(data, batch, delay, forced, forcedGap) {
    var latestData = null;
    const dataFolderPath = path.resolve(__dirname, 'data');
    const latestMinPath = path.resolve(dataFolderPath, 'trade_values_latest.min.json');
    const latestPath = path.resolve(dataFolderPath, 'trade_values_latest.json');

    // Find latest file
    if (fs.existsSync(dataFolderPath)) {
        if (fs.existsSync(latestMinPath)) {
            latestData = JSON.parse(fs.readFileSync(latestMinPath, 'utf8'));
        } else if (fs.existsSync(latestPath)) {
            latestData = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        }
    }

    // Force refresh on the nth day of the month
    const today = new Date();
    const forcedDay = forced;
    const forcedDayPlusGap = (forced + forcedGap <= 31) ? forced + forcedGap : (forced + forcedGap) % 31;
    const isForcedDay = today.getDate() === forcedDay || today.getDate() === forcedDayPlusGap;

    // Process
    for (var i = 0; i < data.length; i += batch) {
        const batchData = data.slice(i, i + batch);
        await Promise.all(batchData.map(async item => {
            try {
                var product = null;
                var productId = null;
                // Local search
                if (!isForcedDay && latestData && latestData?.data) {
                    const foundSku = searchData(latestData.data, item.sku.toString())?.[0];
                    if (foundSku) {
                        product = foundSku;
                        productId = product?.productId || null;
                        item.img = product?.img || null;
                    }
                }
                // Remote search
                if (!product) {
                    product = await searchProductId(item.sku);
                    if (product?.productsId.length > 0) {
                        productId = product?.productsId[0] || null;

                        var img = product?.imagePath?.replace(base_url_img, '').replace('1min', '{1min}{2med}{3max}');
                        item.img = img ? img : null;
                    }
                }

                // Map
                item.productId = productId ? productId : null;
                item.link = productId ? `/${platformMap[item.platform] || item.platform}/Games/${productId}` : null;
            } catch (error) {
                console.error(`Error processing SKU ${item.sku}:`, error.message);
            }
        }));
        await sleep(delay);
    }
    return data;
}