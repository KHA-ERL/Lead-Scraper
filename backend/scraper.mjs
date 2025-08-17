import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { log, logError } from "./logger.mjs";
import { validateEmail } from "./utils.mjs";
import { chromium } from "playwright";

// User-Agent header to avoid simple 403 blocks
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

const visited = new Set();

/**
 * Main entry point. Crawls multiple URLs and returns extracted leads.
 */
export async function scrapeAndExtractLeads(urls) {
  visited.clear();
  const results = [];

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    await crawlPage(url, results);
  }

  return results;
}

/**
 * Crawl a single page and optionally follow internal links (shallow).
 */
async function crawlPage(url, results, depth = 0) {
  if (visited.has(url) || depth > 1) return;
  visited.add(url);

  let $;

  try {
    // Attempt with Axios first
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    $ = cheerio.load(data);
  } catch (err) {
    // If Axios fails, fallback to Playwright
    log(`Axios failed for ${url}. Trying Playwright...`);

    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ userAgent: HEADERS["User-Agent"] });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const html = await page.content();
      await browser.close();
      $ = cheerio.load(html);
    } catch (error) {
      logError(`❌ Failed to crawl ${url}: ${error.message}`);
      return;
    }
  }

  // Extract data
  const pageText = $("body").text();

  let email = null;

// 1. Look for mailto links
const mailtoHref = $('a[href^="mailto:"]').attr("href");
if (mailtoHref) {
  const raw = mailtoHref.replace(/^mailto:/i, "").split("?")[0];
  if (validateEmail(raw)) email = raw;
}

// 2. Search all anchor and span text for email patterns
if (!email) {
  $('a, span, div, p').each((_, el) => {
    const text = $(el).text();
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
    if (match && validateEmail(match[0])) {
      email = match[0];
      return false; // break loop
    }
  });
}

// 3. Fallback: search body text
if (!email) {
  const match = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  if (match && validateEmail(match[0])) {
    email = match[0];
  }
}

email = email || "N/A";


  // Continue extracting the rest...
  const phoneMatch = pageText.match(/(\+?\d[\d\s\-().]{7,})/);
  const addressMatch = pageText.match(
    /\d{1,5}\s\w+(\s\w+)*,\s\w+,\s\w{2,},\s\d{5}/
  );
  const name =
    $("title").text() || $('meta[property="og:site_name"]').attr("content");
  const services = $('meta[name="description"]').attr("content");

  results.push({
    url,
    name: name || "N/A",
    email: email,
    phone: phoneMatch?.[0] || "N/A",
    address: addressMatch?.[0] || "N/A",
    services: services || "N/A",
  });

  // Recurse into internal links
  const baseUrl = new URL(url).origin;
  $("a[href]").each((_, el) => {
    const link = $(el).attr("href");
    if (link && (link.startsWith("/") || link.startsWith(baseUrl))) {
      const fullUrl = link.startsWith("/") ? `${baseUrl}${link}` : link;
      crawlPage(fullUrl, results, depth + 1);
    }
  });
}
