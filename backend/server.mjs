import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { log, logError } from "./logger.mjs";
import { scrapeAndExtractLeads } from "./scraper.mjs";
import { processFile } from "./emailExtract.mjs";

// Emulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = 3000;

// Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 📌 Scrape leads from URLs
app.post("/api/scrape", async (req, res) => {
  const { urls } = req.body;

  //✅Validate input
  if (!Array.isArray(urls) || urls.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No URLs provided." });
  }

  try {
    // You can make depthLimit customizable later via req.body if needed
    const depthLimit = 10;
    const leads = await scrapeAndExtractLeads(urls, { depthLimit });

    const fileName = `leads_${Date.now()}.txt`;
    const filePath = join(__dirname, "../public/leads", fileName);

    const formattedLeads = leads
      .map(
        (lead, i) => `
Company #${i + 1}
--------------------------
Company Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone}
Address: ${lead.address}
Services: ${lead.services}
URL: ${lead.url}
        `
      )
      .join("\n");

    fs.writeFileSync(filePath, formattedLeads);

    res.json({ success: true, file: `/leads/${fileName}` });
  } catch (err) {
    logError("❌ Scraping error:", err);
    res.status(500).json({ success: false, message: "Scraping failed" });
  }
});

// 📌 Extract emails from uploaded file
app.post("/api/extract-emails", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;

  try {
    const outputFileName = `extracted_emails_${Date.now()}.txt`;
    const outputFilePath = join(__dirname, "../public/leads", outputFileName);

    await processFile(filePath, outputFilePath);

    res.json({ success: true, file: `/leads/${outputFileName}` });
  } catch (err) {
    logError("❌ Email extraction error:", err);
    res
      .status(500)
      .json({ success: false, message: "Email extraction failed" });
  } finally {
    fs.unlinkSync(filePath); // Delete uploaded temp file
  }
});

// Start server
app.listen(PORT, () => {
  log(`✅ Server running at: http://localhost:${PORT}`);
});
