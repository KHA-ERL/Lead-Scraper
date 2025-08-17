// 🚨 Custom patch: Bypass buggy pdf-parse/index.js to avoid ENOENT error from missing test file.
// We import only the core logic without triggering its debug test mode.

import pdfParse from 'pdf-parse/lib/pdf-parse.js';
export default pdfParse;
