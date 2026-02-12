/**
 * Simple in-memory progress tracker for video transcoding
 */

// Map of filename -> { percent: number, stage: 'transcoding' | 'thumbnail' }
const progressMap = new Map();

function setProgress(filename, percent, stage = 'transcoding') {
  progressMap.set(filename, { percent: Math.round(percent), stage });
}

function getProgress(filename) {
  return progressMap.get(filename) || null;
}

function clearProgress(filename) {
  progressMap.delete(filename);
}

function getAllProgress() {
  const result = {};
  for (const [filename, progress] of progressMap) {
    result[filename] = progress;
  }
  return result;
}

module.exports = {
  setProgress,
  getProgress,
  clearProgress,
  getAllProgress,
};
