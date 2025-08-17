import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logs directory
const logsDir = path.join(__dirname, "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate daily log file
const logFilePath = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);

export function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, line);
  console.log(line.trim());
}

export function logError(error) {
  const message = (typeof error === "string" ? error : error.stack || error.message || error);
  log(`❌ ERROR: ${message}`);
}
