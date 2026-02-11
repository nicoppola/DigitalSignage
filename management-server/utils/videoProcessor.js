const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Transcode a video from disk to H.264/MP4 format optimized for Pi playback
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputPath - Where to save the transcoded video
 * @param {object} config - Transcoding settings from mediaConfig
 * @returns {Promise<string>} - The output path on success
 */
async function transcodeVideoFromDisk(inputPath, outputPath, config) {
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
  isVideo,
  isImage,
};
