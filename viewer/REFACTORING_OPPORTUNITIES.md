# Viewer Refactoring Opportunities

## Completed ✓

- ~~**Extract CSS to separate file**~~ - Moved to `viewer.css`
- ~~**Extract JS to separate file**~~ - Moved to `viewer.js`
- ~~**Commented-out code**~~ - Removed dead `refreshIntervalSec` line
- ~~**Redundant CSS properties**~~ - Fixed conflicting height values
- ~~**Magic numbers**~~ - Extracted to `DEFAULT_CONFIG` object
- ~~**Duplicate panel IDs**~~ - Simplified to template literal
- ~~**Inefficient DOM recreation**~~ - Split into `renderImages()` (full rebuild) and `rotateImage()` (toggle class only)
- ~~**No image preloading**~~ - Added `preloadImage()` helper; `renderImages()` now preloads all images before displaying
- ~~**JSON.stringify for array comparison**~~ - Added `arraysEqual()` helper that checks length first, then compares elements
- ~~**Inconsistent naming**~~ - Standardized all parameters and variables to use `side` instead of `panel`
- ~~**Right side has different default**~~ - Added `leftRotateIntervalSec` (5s) and `rightRotateIntervalSec` (15s) to `DEFAULT_CONFIG`

## Low Priority

3. **No error UI for users** - Errors only go to `console.warn`; users see blank panels with no feedback.
