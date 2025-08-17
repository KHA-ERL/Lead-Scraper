import axios from 'axios';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { validateEmail } from './utils.mjs';

// Ensure Axios uses node-fetch
axios.defaults.adapter = function (config) {
  config.adapter = async function (config) {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.data
    });

    return {
      data: await response.json(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  };
};

// Ensure axios doesn't try to use undici
globalThis.fetch = fetch;

const visited = new Set();

export async function scrapeAndExtractLeads(urls) {
    visited.clear();
    const results = [];

    for (const url of urls) {
        const normalizedUrl = url.trim();
        await crawlPage(normalizedUrl, results);
    }

    return results;
}

async function crawlPage(url, results, depth = 0) {
    if (visited.has(url) || depth > 1) return;
    visited.add(url);

    try {
        const { data } = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(data);

        // Extracting data
        const pageText = $('body').text();
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
        const phoneMatch = pageText.match(/(\+?\d[\d\s\-().]{7,})/);
        const addressMatch = pageText.match(/\d{1,5}\s\w+(\s\w+)*,\s\w+,\s\w{2,},\s\d{5}/);
        const name = $('title').text() || $('meta[property="og:site_name"]').attr('content');
        const services = $('meta[name="description"]').attr('content');

        const lead = {
            url,
            name: name || 'N/A',
            email: validateEmail(emailMatch?.[0]) ? emailMatch[0] : 'N/A',
            phone: phoneMatch?.[0] || 'N/A',
            address: addressMatch?.[0] || 'N/A',
            services: services || 'N/A'
        };

        results.push(lead);

        // Recursively crawl internal links
        const baseUrl = new URL(url).origin;
        $('a[href]').each((_, el) => {
            const link = $(el).attr('href');
            if (link && (link.startsWith('/') || link.startsWith(baseUrl))) {
                const fullUrl = link.startsWith('/') ? `${baseUrl}${link}` : link;
                crawlPage(fullUrl, results, depth + 1);
            }
        });
    } catch (err) {
        console.warn(`Failed to crawl ${url}: ${err.message}`);
    }
}
// const axios = require('axios');
// const fetch = require('node-fetch');

// // Axios will now use node-fetch as the HTTP client
// axios.defaults.adapter = require('axios/lib/adapters/http');

// // This may help ensure axios doesn't try to use undici directly
// global.fetch = fetch;

// const cheerio = require('cheerio');
// const { URL } = require('url');
// const { validateEmail } = require('./utils');

// const visited = new Set();

// async function scrapeAndExtractLeads(urls) {
//     visited.clear();
//     const results = [];

//     for (const url of urls) {
//         const normalizedUrl = url.trim();
//         await crawlPage(normalizedUrl, results);
//     }

//     return results;
// }

// async function crawlPage(url, results, depth = 0) {
//     if (visited.has(url) || depth > 1) return;
//     visited.add(url);

//     try {
//         const { data } = await axios.get(url, { timeout: 10000 }); // Axios used here
//         const $ = cheerio.load(data);

//         // Extracting data
//         const pageText = $('body').text();
//         const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
//         const phoneMatch = pageText.match(/(\+?\d[\d\s\-().]{7,})/);
//         const addressMatch = pageText.match(/\d{1,5}\s\w+(\s\w+)*,\s\w+,\s\w{2,},\s\d{5}/);
//         const name = $('title').text() || $('meta[property="og:site_name"]').attr('content');
//         const services = $('meta[name="description"]').attr('content');

//         const lead = {
//             url,
//             name: name || 'N/A',
//             email: validateEmail(emailMatch?.[0]) ? emailMatch[0] : 'N/A',
//             phone: phoneMatch?.[0] || 'N/A',
//             address: addressMatch?.[0] || 'N/A',
//             services: services || 'N/A'
//         };

//         results.push(lead);

//         // Recursively crawl internal links
//         const baseUrl = new URL(url).origin;
//         $('a[href]').each((_, el) => {
//             const link = $(el).attr('href');
//             if (link && link.startsWith('/') || link.startsWith(baseUrl)) {
//                 const fullUrl = link.startsWith('/') ? `${baseUrl}${link}` : link;
//                 crawlPage(fullUrl, results, depth + 1);
//             }
//         });
//     } catch (err) {
//         console.warn(`Failed to crawl ${url}: ${err.message}`);
//     }
// }

// module.exports = { scrapeAndExtractLeads };
