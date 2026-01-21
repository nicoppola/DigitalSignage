# Video Support Implementation Plan

## Overview
Add video upload and playback support to the Digital Signage system. Videos will be transcoded to H.264/MP4 for optimal Raspberry Pi 4 playback.

## Key Decisions
- **Playback**: Videos play during their rotation slot only
- **Timing**: Let videos finish before rotating to next media
- **Compression**: Transcode all videos to H.264/MP4 (Pi 4 has hardware decoding)
- **Formats**: Accept MP4, WebM, MOV, AVI, MKV on upload → store as MP4

---

## Phase 1: Backend - Config & Upload

### 1.1 Rename and update config
**File**: `management-server/config/imageConfig.js` → `mediaConfig.js`

```javascript
module.exports = {
  // Image settings (unchanged)
  LANDSCAPE_WIDTH: 1920,
  LANDSCAPE_HEIGHT: 1080,
  PORTRAIT_WIDTH: 1080,
  PORTRAIT_HEIGHT: 1920,
  WEBP_QUALITY: 92,
  RESIZE_FIT: 'inside',

  // Upload limits
  MAX_IMAGE_SIZE: 50 * 1024 * 1024,      // 50MB
  MAX_VIDEO_SIZE: 500 * 1024 * 1024,     // 500MB
  MAX_FILES: 20,

  // Allowed MIME types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],

  // Video transcoding settings
  VIDEO_CODEC: 'libx264',
  VIDEO_PRESET: 'medium',      // balance speed/quality
  VIDEO_CRF: 23,               // quality (lower = better, 18-28 typical)
  VIDEO_MAX_WIDTH: 1920,
  VIDEO_MAX_HEIGHT: 1080,
};
```

### 1.2 Update files.js upload route
**File**: `management-server/routes/files.js`

Changes:
- Update multer to accept larger files for video
- Change field name from `'images'` to `'media'`
- Add file type detection helper
- Process images with Sharp (existing)
- Process videos with FFmpeg (new)
- Handle async video transcoding

```javascript
// New helper
function isVideo(mimetype) {
  return mimetype.startsWith('video/');
}

function isImage(mimetype) {
  return mimetype.startsWith('image/');
}

// Updated upload handler
router.post('/upload', upload.array('media', MAX_FILES), async (req, res) => {
  // For each file:
  // - If image: process with Sharp → save as .webp
  // - If video: transcode with FFmpeg → save as .mp4
});
```

### 1.3 Add FFmpeg video processing
**File**: `management-server/utils/videoProcessor.js` (new)

```javascript
const ffmpeg = require('fluent-ffmpeg');

async function transcodeVideo(inputBuffer, outputPath, config) {
  // Write buffer to temp file
  // Transcode to H.264/MP4 with config settings
  // Scale down if larger than 1920x1080
  // Return output path
}
```

### 1.4 Update imports in routes
**Files**: All files importing `imageConfig.js` → update to `mediaConfig.js`

---

## Phase 2: Viewer - Video Playback

### 2.1 Update viewer.js
**File**: `viewer/viewer.js`

Changes:
- Rename `images` → `media` throughout
- Add file type detection from extension
- Create `<video>` elements for videos, `<img>` for images
- Handle video end event to trigger rotation
- Update preloading for videos

```javascript
function isVideoFile(filename) {
  return filename.endsWith('.mp4') || filename.endsWith('.webm');
}

async function renderMedia(side) {
  // For each file:
  // - If video: create <video autoplay muted>
  // - If image: create <img>
  // - Add 'ended' event listener to videos
}

function handleVideoEnded(side) {
  // Advance to next media when video finishes
}
```

### 2.2 Update viewer.css
**File**: `viewer/viewer.css`

Add video styling to match images:
```css
.panel video {
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  display: none;
}

.panel video.active {
  display: block;
}
```

### 2.3 Update rotation logic
**File**: `viewer/viewer.js`

- For images: use timer-based rotation (existing)
- For videos: wait for `ended` event, then rotate
- Clear/pause timers during video playback

---

## Phase 3: Frontend - Upload UI

### 3.1 Update ImageUploader
**File**: `management-app/src/components/ImageUploader/ImageUploader.tsx`

Changes:
- Update file filter to accept videos
- Update `accept` attribute
- Update UI text ("images" → "media")
- Add file size validation for videos

```typescript
// File filter
const validFiles = selectedFiles.filter((file) =>
  file.type.startsWith("image/") || file.type.startsWith("video/")
);

// Input
<input type="file" accept="image/*,video/*" multiple ... />
```

### 3.2 Update FileList
**File**: `management-app/src/components/FileList/FileList.tsx`

Changes:
- Detect video files by extension
- Show play icon overlay for videos instead of thumbnail
- Or show first frame as poster (more complex)

```typescript
const isVideo = file.endsWith('.mp4') || file.endsWith('.webm');

{isVideo ? (
  <div className="video-thumbnail">
    <span className="play-icon">▶</span>
  </div>
) : (
  <img src={`/uploads/${folderName}/${file}`} ... />
)}
```

### 3.3 Update API service
**File**: `management-app/src/services/api.js`

Changes:
- Change form field from `'images'` to `'media'`
- Increase upload timeout for videos

### 3.4 Update constants
**File**: `management-app/src/utils/constants.ts`

```typescript
XHR_UPLOAD: 300000,  // 5 minutes for video uploads
```

---

## Phase 4: Dependencies & Install

### 4.1 Install FFmpeg on server
```bash
# On Raspberry Pi / Debian
sudo apt-get install ffmpeg

# On macOS (for development)
brew install ffmpeg
```

### 4.2 Install fluent-ffmpeg
```bash
cd management-server
npm install fluent-ffmpeg
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `management-server/config/imageConfig.js` | Rename to mediaConfig.js, add video settings |
| `management-server/routes/files.js` | Add video processing, change field name |
| `management-server/utils/videoProcessor.js` | New file for FFmpeg transcoding |
| `viewer/viewer.js` | Add video element creation, handle playback |
| `viewer/viewer.css` | Add video styling |
| `management-app/.../ImageUploader.tsx` | Accept video types |
| `management-app/.../FileList.tsx` | Video thumbnail/icon display |
| `management-app/.../api.js` | Change field name, increase timeout |
| `management-app/.../constants.ts` | Increase upload timeout |

---

## Verification Checklist

- [ ] Upload test: Upload an MP4, MOV, and AVI file through the management UI
- [ ] Transcoding test: Verify uploaded videos are stored as `.mp4` in uploads folder
- [ ] Viewer test: Open `/viewer` and confirm videos play during rotation
- [ ] Timing test: Verify rotation waits for video to finish before advancing
- [ ] Pi test: Deploy to Raspberry Pi and verify smooth H.264 playback
