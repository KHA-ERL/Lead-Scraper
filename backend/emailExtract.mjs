import fs from 'fs';
import os from 'os';
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

  return extractTextFromBuffer(buffer, ext, filePath);
};

const extractTextFromBuffer = (buffer, ext, fallbackFilePath) => {
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
      const mimeType = mime.lookup(fallbackFilePath);
      if (!mimeType) {
        return reject(new Error("Could not determine MIME type for: " + fallbackFilePath));
      }

      textract.fromFileWithMimeAndPath(mimeType, fallbackFilePath, (error, text) => {
        if (error) {
          reject(new Error("Textract failed: " + error.message));
        } else {
          resolve(text);
        }
      });
    }
  });
};

const formatEmails = (emails) => emails.join('\n');

// 📤 Main handler
export const processFile = async (inputPath, outputPath) => {
  try {
    const text = await extractText(inputPath);

    if (!text || text.trim().length === 0) {
      throw new Error("Extracted text is empty.");
    }

    const emails = getEmailsFromText(text);
    const output = formatEmails(emails);

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
      console.log(`✅ Extracted ${emails.length} emails to ${outputPath}`);
    }

    return output;
  } catch (err) {
    console.error(`❌ Failed to process file: ${err.message}`);
    throw new Error("❌ Email extraction error: " + err.message);
  }
};

export const processUploadedFile = async (file) => {
  const ext = extname(file.originalname).toLowerCase();
  const tempFilePath = path.join(
    os.tmpdir(),
    `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );

  try {
    fs.writeFileSync(tempFilePath, file.buffer);
    const text = await extractTextFromBuffer(file.buffer, ext, tempFilePath);

    if (!text || text.trim().length === 0) {
      throw new Error("Extracted text is empty.");
    }

    const emails = getEmailsFromText(text);
    console.log(`✅ Extracted ${emails.length} emails from ${file.originalname}`);
    return formatEmails(emails);
  } catch (err) {
    console.error(`❌ Failed to process uploaded file: ${err.message}`);
    throw new Error("❌ Email extraction error: " + err.message);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};
