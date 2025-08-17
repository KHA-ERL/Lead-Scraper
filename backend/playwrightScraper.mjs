// backend/playwrightScraper.mjs
import { chromium } from 'playwright';

/**
 * Fetches fully rendered HTML using Playwright.
 * @param {string} url - The URL to scrape.
 * @param {boolean} headless - Whether to run headless.
 * @returns {string|null} - HTML content or null on failure.
 */
export async function fetchPageWithPlaywright(url, headless = true) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    return html;
  } catch (err) {
    console.error(`Playwright failed to load ${url}:`, err);
    return null;
  } finally {
    await browser.close();
  }
}
