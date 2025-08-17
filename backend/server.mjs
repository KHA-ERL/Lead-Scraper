import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { scrapeAndExtractLeads } from './scraper.mjs';
import { processFile } from './emailExtract.mjs';

// Create __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// URL scraping endpoint
app.post('/api/scrape', async (req, res) => {
    const { urls } = req.body;

    try {
        const leads = await scrapeAndExtractLeads(urls);
        const fileName = `leads_${Date.now()}.txt`;
        const filePath = join(__dirname, '../public/leads', fileName);

        const formattedLeads = leads.map((lead, i) => `
Company #${i + 1}
--------------------------
Company Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone}
Address: ${lead.address}
Services: ${lead.services}
URL: ${lead.url}
        `).join('\n');

        fs.writeFileSync(filePath, formattedLeads);

        res.json({ success: true, file: `/leads/${fileName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Scraping failed' });
    }
});

// File upload and email extraction endpoint
app.post('/api/extract-emails', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;

    try {
        const outputFileName = `extracted_emails_${Date.now()}.txt`;
        const outputFilePath = join(__dirname, '../public/leads', outputFileName);

        await processFile(filePath, outputFilePath);

        res.json({ success: true, file: `/leads/${outputFileName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Email extraction failed' });
    } finally {
        fs.unlinkSync(filePath);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// const express = require('express');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// const multer = require('multer');
// const { scrapeAndExtractLeads } = require('./scraper');
// const { processFile, extractEmailsFromFile } = require('./emailExtract');

// const app = express();
// const PORT = 3000;

// const upload = multer({ dest: 'uploads/' }); // Specify upload folder

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // URL scraping endpoint
// app.post('/api/scrape', async (req, res) => {
//     const { urls } = req.body;

//     try {
//         const leads = await scrapeAndExtractLeads(urls);
//         const fileName = `leads_${Date.now()}.txt`;
//         const filePath = path.join(__dirname, '../public/leads', fileName);

//         const formattedLeads = leads.map((lead, i) => `
// Company #${i + 1}
// --------------------------
// Company Name: ${lead.name}
// Email: ${lead.email}
// Phone: ${lead.phone}
// Address: ${lead.address}
// Services: ${lead.services}
// URL: ${lead.url}
//         `).join('\n');

//         fs.writeFileSync(filePath, formattedLeads);

//         res.json({ success: true, file: `/leads/${fileName}` });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: 'Scraping failed' });
//     }
// });

// // File upload and email extraction endpoint
// app.post('/api/extract-emails', upload.single('file'), async (req, res) => {
//     const filePath = req.file.path;

//     try {
//         const outputFileName = `extracted_emails_${Date.now()}.txt`;
//         const outputFilePath = path.join(__dirname, '../public/leads', outputFileName);

//         await processFile(filePath, outputFilePath); // Process file to extract emails

//         res.json({ success: true, file: `/leads/${outputFileName}` });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: 'Email extraction failed' });
//     } finally {
//         fs.unlinkSync(filePath); // Delete the uploaded file after processing
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });
