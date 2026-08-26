# 📧 Email Lead Extractor (Node.js + Playwright + Express)

A powerful web and file-based email extraction tool built with Node.js, Playwright, Cheerio, and Express. This project allows you to:

- 🕸️ Scrape business contact details (email, phone, address, services) from websites.
- 📂 Upload documents (`.pdf`, `.docx`, `.txt`, etc.) to extract embedded email addresses.
- ✅ Automatically detect file types and process content using smart parsers (Mammoth, textract, pdf-parse).
- 📋 Return results directly in the browser for one-tap clipboard copying.
- 🌐 Interact via a user-friendly web UI served on `localhost:3000`.

---

## 🚀 Features

- 🔍 **Web Scraping**:
  - Crawls a given list of URLs.
  - Uses `axios` and `cheerio` by default.
  - Falls back to `playwright` for JavaScript-heavy pages.
  - Extracts:
    - `email` (via `mailto:` and raw text)
    - `phone`
    - `address`
    - `services`
    - `page title` (as company name)
  - Supports shallow recursive crawling of internal links.

- 📂 **File Upload + Extraction**:
  - Upload `.pdf`, `.docx`, `.txt`, and more.
  - Extract all email addresses inside uploaded documents.
  - Safe and smart MIME detection using `mime-types`.
  - Handles broken files and logs all errors clearly.

- 🛠️ Built With:
  - `express` for backend API
  - `multer` for file uploads
  - `playwright` for scraping JS-rendered pages
  - `pdf-parse`, `mammoth`, `textract` for parsing various file types
  - `cheerio` for HTML parsing

---

## 🖼️ Screenshot

> 📌 _Replace this image with your actual screenshot and path in the `public/` folder._

![App Screenshot](public/Screenshot%202025-08-17%20at%2012.36.43 AM.png)

---

## 🧰 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/KHA-ERL/Lead-Scraper
cd Lead-Scraper

### 2. Install dependencies

npm install

### 3. Start the development server

npm start

Server will be live at:
http://localhost:3000

---

🧪 Usage
🔗 Web Scraping

Endpoint: POST /api/scrape
Payload:
{
  "urls": [
    "https://example.com/contact",
    "https://anotherbusiness.com"
  ]
}

Response:
Returns extracted leads as text that can be copied from the browser.

📤 File Upload for Email Extraction

Endpoint: POST /api/extract-emails
Form-Data:

file – the document file to extract emails from.

Response:
Returns extracted email addresses as text that can be copied from the browser.

📦 email/
├── backend/
│   ├── emailExtract.mjs        # Handles file-based email extraction
│   ├── patchedPdfParse.mjs     # Patched version of pdf-parse
│   ├── scraper.mjs             # Core web scraping logic
│   └── server.mjs              # Express server and route handlers
├── public/
│   └── screenshot.png          # UI screenshot

⚙️ Scripts
npm start   # Launch the Express server on port 3000

📦 Dependencies
{
  "axios": "^1.11.0",
  "cheerio": "^1.0.0-rc.12",
  "cors": "^2.8.5",
  "express": "^5.1.0",
  "mammoth": "^1.9.1",
  "mime-types": "^3.0.1",
  "multer": "^2.0.2",
  "pdf-parse": "^1.1.0",
  "playwright": "^1.54.2",
  "textract": "^2.5.0"
}

📌 Notes
Ensure that Playwright dependencies are installed properly

For .pdf files that are image-based, OCR is not supported by default. You can add Tesseract integration if needed.

Generated leads are returned directly to the page instead of being stored in `public/leads/`.

📝 License

This project is licensed under the ISC License.

👤 Author

KHA-ERL
