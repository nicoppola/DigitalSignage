const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate a thumbnail from a video file
 * @param {string} videoPath - Path to the video file
 * @param {string} thumbnailPath - Where to save the thumbnail
 * @returns {Promise<string>} - The thumbnail path on success
 */
async function generateThumbnail(videoPath, thumbnailPath) {
  return new Promise((resolve, reject) => {
    // Use direct ffmpeg command: seek to 2 seconds, grab 1 frame
    ffmpeg(videoPath)
      .seekInput(2) // Seek to 2 seconds (avoids black intros)
      .frames(1)    // Capture just 1 frame
      .size('320x?') // 320px wide, maintain aspect ratio
      .output(thumbnailPath)
      .on('end', () => {
        console.log(`[FFmpeg] Thumbnail generated: ${thumbnailPath}`);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.error(`[FFmpeg] Thumbnail error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Transcode a video from disk to H.264/MP4 format optimized for Pi playback
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputPath - Where to save the transcoded video
 * @param {object} config - Transcoding settings from mediaConfig
 * @param {function} onProgress - Optional callback for progress updates (percent)
 * @returns {Promise<string>} - The output path on success
 */
async function transcodeVideoFromDisk(inputPath, outputPath, config, onProgress) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec(config.VIDEO_CODEC)
      .addOptions([
        `-preset ${config.VIDEO_PRESET}`,
        `-crf ${config.VIDEO_CRF}`,
        // Scale down if larger than max dimensions, preserve aspect ratio
        `-vf scale='min(${config.VIDEO_MAX_WIDTH},iw)':min'(${config.VIDEO_MAX_HEIGHT},ih)':force_original_aspect_ratio=decrease`,
      ])
      .audioCodec('aac')
      .audioBitrate('128k')
      .format('mp4')
      .on('start', (cmd) => {
        console.log(`[FFmpeg] Starting transcode: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[FFmpeg] Progress: ${Math.round(progress.percent)}%`);
          if (onProgress) {
            onProgress(progress.percent);
          }
        }
      })
      .on('end', async () => {
        // Clean up input temp file
        try {
          await fs.promises.unlink(inputPath);
        } catch (e) {
          console.warn(`[FFmpeg] Could not delete temp file: ${inputPath}`);
        }
        console.log(`[FFmpeg] Transcode complete: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', async (err) => {
        // Clean up input temp file on error
        try {
          await fs.promises.unlink(inputPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        console.error(`[FFmpeg] Error: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Check if a MIME type is a video
 */
function isVideo(mimetype) {
  return mimetype && mimetype.startsWith('video/');
}

/**
 * Check if a MIME type is an image
 */
function isImage(mimetype) {
  return mimetype && mimetype.startsWith('image/');
}

module.exports = {
  transcodeVideoFromDisk,
  generateThumbnail,
  isVideo,
  isImage,
};
