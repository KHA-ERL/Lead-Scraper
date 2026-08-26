import express from "express";
import cors from "cors";
import multer from "multer";
import "./logger.mjs";
import { log, logError } from "./logger.mjs";
import { scrapeAndExtractLeads } from "./scraper.mjs";
import { processUploadedFile } from "./emailExtract.mjs";

// Create Express app
const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });

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

    res.json({ success: true, text: formattedLeads });
  } catch (err) {
    logError("❌ Scraping error:", err);
    res.status(500).json({ success: false, message: "Scraping failed" });
  }
});

// 📌 Extract emails from uploaded file
app.post("/api/extract-emails", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }

  try {
    const text = await processUploadedFile(req.file);

    res.json({ success: true, text });
  } catch (err) {
    logError("❌ Email extraction error:", err);
    res
      .status(500)
      .json({ success: false, message: "Email extraction failed" });
  }
});

// Start server
app.listen(PORT, () => {
  log(`✅ Server running at: http://localhost:${PORT}`);
});
