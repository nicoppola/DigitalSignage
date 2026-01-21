# Server Refactoring Opportunities

## Critical (Security)

1. **Hardcoded session secret** (server.js line 33) - Move `'some-super-secret-key'` to environment variables
2. **Plain-text credentials** in users.js - Use hashed passwords or env vars
3. **CORS hardcoded to localhost** (server.js line 21) - Make configurable for deployment

## Completed ✓

- ~~**Single 350-line file**~~ - Split into route modules (`routes/auth.js`, `routes/files.js`, `routes/config.js`, `routes/system.js`)
- ~~**Mixed async patterns**~~ - Converted all to `fs.promises` with async/await
- ~~**Duplicated sanitization**~~ - Extracted to `utils/paths.js`
- ~~**No input validation on filename**~~ - Added `sanitizeFilename()` function
- ~~**No centralized error handling**~~ - Added `middleware/errorHandler.js`
- ~~**Hardcoded image config**~~ - Extracted to `config/imageConfig.js`
- ~~**No file size limits on multer**~~ - Added limits in `config/imageConfig.js`
- ~~**Debug console.logs**~~ - Removed
- ~~**Commented-out code**~~ - Removed
