import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define logs directory inside backend/logs
const logsDir = path.join(__dirname, "logs");

// Ensure directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Daily log file
const logFilePath = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);

// Append message to log file with timestamp
const appendLog = (message) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, line);
};

// Mirror console.log and console.error
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args.join(" ");
  originalLog(message);         // Show in terminal
  appendLog(message);           // Save to log file
};

console.error = (...args) => {
  const message = args.join(" ");
  originalError(message);       // Show in terminal
  appendLog(`❌ ERROR: ${message}`); // Save to log file
};

// Optional: utility log functions (for structured use)
export function log(msg) {
  console.log(msg);
}

export function logError(err) {
  console.error(err instanceof Error ? err.stack || err.message : err);
}
