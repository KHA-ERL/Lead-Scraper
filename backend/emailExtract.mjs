import fs from 'fs';
import path, { extname } from 'path';
import pdf from './patchedPdfParse.mjs'; // Still using patched version
import mammoth from 'mammoth';
import textract from 'textract';
import mime from 'mime-types';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// 🔍 Extract unique emails from text
const getEmailsFromText = (text) => {
  const emails = text.match(EMAIL_REGEX);
  return emails ? [...new Set(emails)] : [];
};

// 🧠 Safe text extractor per file type
const extractText = (filePath) => {
  const ext = extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  return new Promise((resolve, reject) => {
    if (ext === '.pdf') {
      pdf(buffer)
        .then((data) => {
          if (!data || !data.text) {
            return reject(new Error("PDF parsed but returned no text."));
          }
          resolve(data.text);
        })
        .catch((err) => {
          reject(new Error("PDF parsing failed: " + err.message));
        });

    } else if (ext === '.docx') {
      mammoth.extractRawText({ buffer })
        .then((result) => resolve(result.value))
        .catch((err) => reject(new Error("DOCX parsing failed: " + err.message)));

    } else if (ext === '.txt') {
      resolve(buffer.toString());

    } else {
      const mimeType = mime.lookup(filePath);
      if (!mimeType) {
        return reject(new Error("Could not determine MIME type for: " + filePath));
      }

      textract.fromFileWithMimeAndPath(mimeType, filePath, (error, text) => {
        if (error) {
          reject(new Error("Textract failed: " + error.message));
        } else {
          resolve(text);
        }
      });
    }
  });
};

// 📤 Main handler
export const processFile = async (inputPath, outputPath) => {
  try {
    const text = await extractText(inputPath);

    if (!text || text.trim().length === 0) {
      throw new Error("Extracted text is empty.");
    }

    const emails = getEmailsFromText(text);

    fs.writeFileSync(outputPath, emails.join('\n'));
    console.log(`✅ Extracted ${emails.length} emails to ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to process file: ${err.message}`);
    throw new Error("❌ Email extraction error: " + err.message);
  }
};
