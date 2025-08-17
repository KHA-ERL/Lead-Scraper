import fs from 'fs';
import path from 'path';
// 🚨 Using patched pdf-parse to avoid buggy debug mode that reads a non-existent test PDF
import pdf from './patchedPdfParse.mjs';
import mammoth from 'mammoth';
import textract from 'textract';
import { fileURLToPath } from 'url';
import { dirname, extname } from 'path';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const getEmailsFromText = (text) => {
    const emails = text.match(EMAIL_REGEX);
    return emails ? [...new Set(emails)] : [];
};

const extractText = (filePath) => {
    const ext = extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    return new Promise((resolve, reject) => {
        if (ext === '.pdf') {
            pdf(buffer).then(data => resolve(data.text)).catch(reject);
        } else if (ext === '.docx') {
            mammoth.extractRawText({ buffer }).then(result => resolve(result.value)).catch(reject);
        } else if (ext === '.txt') {
            resolve(buffer.toString());
        } else {
            textract.fromFileWithPath(filePath, (error, text) => {
                if (error) reject(error);
                else resolve(text);
            });
        }
    });
};

export const processFile = async (inputPath, outputPath) => {
    try {
        const text = await extractText(inputPath);
        const emails = getEmailsFromText(text);
        fs.writeFileSync(outputPath, emails.join('\n'));
        console.log(`✅ Extracted ${emails.length} emails to ${outputPath}`);
    } catch (err) {
        console.error(`❌ Failed to process file: ${err.message}`);
        throw err;
    }
};
// const fs = require('fs');
// const path = require('path');
// const pdf = require('pdf-parse');
// const mammoth = require('mammoth');
// const textract = require('textract');

// const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// const getEmailsFromText = (text) => {
//     const emails = text.match(EMAIL_REGEX);
//     return emails ? [...new Set(emails)] : [];
// };

// const extractText = (filePath) => {
//     const ext = path.extname(filePath).toLowerCase();
//     const buffer = fs.readFileSync(filePath);

//     return new Promise((resolve, reject) => {
//         if (ext === '.pdf') {
//             pdf(buffer).then(data => resolve(data.text)).catch(reject);
//         } else if (ext === '.docx') {
//             mammoth.extractRawText({ buffer }).then(result => resolve(result.value)).catch(reject);
//         } else if (ext === '.txt') {
//             resolve(buffer.toString());
//         } else {
//             textract.fromFileWithPath(filePath, (error, text) => {
//                 if (error) reject(error);
//                 else resolve(text);
//             });
//         }
//     });
// };

// const processFile = async (inputPath, outputPath) => {
//     try {
//         const text = await extractText(inputPath);
//         const emails = getEmailsFromText(text);
//         fs.writeFileSync(outputPath, emails.join('\n'));
//         console.log(`✅ Extracted ${emails.length} emails to ${outputPath}`);
//     } catch (err) {
//         console.error(`❌ Failed to process file: ${err.message}`);
//         throw err;
//     }
// };

// module.exports = { processFile };
