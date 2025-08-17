import fs from 'fs';
import path, { extname } from 'path';
import { fileURLToPath } from 'url';
import pdf from './patchedPdfParse.mjs'; // Patched pdf-parse
import mammoth from 'mammoth';
import textract from 'textract';
import mime from 'mime-types'; // ✅ Import this

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// 🔍 Extract unique emails
const getEmailsFromText = (text) => {
  const emails = text.match(EMAIL_REGEX);
  return emails ? [...new Set(emails)] : [];
};

// 📄 Extract text from multiple file formats
const extractText = (filePath) => {
  const ext = extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  return new Promise((resolve, reject) => {
    if (ext === '.pdf') {
      // Use patched pdf-parse
      pdf(buffer).then(data => resolve(data.text)).catch(reject);

    } else if (ext === '.docx') {
      // Use mammoth for DOCX
      mammoth.extractRawText({ buffer })
        .then(result => resolve(result.value))
        .catch(reject);

    } else if (ext === '.txt') {
      // Basic TXT
      resolve(buffer.toString());

    } else {
      // 🩹 Fix: use textract with MIME type
      const mimeType = mime.lookup(filePath);
      if (!mimeType) return reject(new Error("Could not determine MIME type."));

      textract.fromFileWithMimeAndPath(mimeType, filePath, (error, text) => {
        if (error) reject(error);
        else resolve(text);
      });
    }
  });
};

// 📤 Main processor
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
