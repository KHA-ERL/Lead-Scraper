import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import "./logger.mjs";
import { log, logError } from "./logger.mjs";
import { validateEmail } from "./utils.mjs";
import { chromium } from "playwright";

// User-Agent header to avoid simple 403 blocks
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

const visited = new Set();
const DEFAULT_DEPTH_LIMIT = 1;

/**
 * Main entry point. Crawls multiple URLs and returns extracted leads.
 */
export async function scrapeAndExtractLeads(urls, options = {}) {
  visited.clear();
  const results = [];
  const depthLimit = Number.isInteger(options.depthLimit)
    ? options.depthLimit
    : DEFAULT_DEPTH_LIMIT;

  for (const rawUrl of urls) {
    const url = normalizeStartUrl(rawUrl);
    if (!url) {
      log(`Skipping invalid URL input: ${rawUrl}`);
      continue;
    }

    await crawlPage(url, results, 0, depthLimit);
  }

  return results;
}

/**
 * Crawl a single page and optionally follow internal links (shallow).
 */
async function crawlPage(url, results, depth = 0, depthLimit = DEFAULT_DEPTH_LIMIT) {
  if (visited.has(url) || depth > depthLimit) return;
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
  const internalLinks = [];

  $("a[href]").each((_, el) => {
    const link = $(el).attr("href");
    const fullUrl = normalizeInternalUrl(link, baseUrl);

    if (fullUrl && !visited.has(fullUrl)) {
      internalLinks.push(fullUrl);
    }
  });

  await Promise.all(
    internalLinks.map((fullUrl) =>
      crawlPage(fullUrl, results, depth + 1, depthLimit)
    )
  );
}

function normalizeInternalUrl(link, baseUrl) {
  if (!link) return null;

  try {
    const parsed = new URL(link, baseUrl);

    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.origin !== baseUrl) return null;

    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function normalizeStartUrl(rawUrl) {
  if (!rawUrl || validateEmail(rawUrl.trim())) return null;

  try {
    const value = rawUrl.trim();
    if (/\s/.test(value)) return null;

    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);

    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname.includes(".")) return null;

    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}
