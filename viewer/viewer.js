// Side identifiers
const SIDES = {
  LEFT: 'left',
  RIGHT: 'right',
};

// Default configuration values
const DEFAULT_CONFIG = {
  leftRotateIntervalSec: 5,
  rightRotateIntervalSec: 15,
  refreshIntervalSec: 60,
  configPollIntervalMs: 60 * 1000,
};

const config = {
  [SIDES.LEFT]: { rotateIntervalSec: DEFAULT_CONFIG.leftRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec },
  [SIDES.RIGHT]: { rotateIntervalSec: DEFAULT_CONFIG.rightRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec }
};

const state = {
  [SIDES.LEFT]: {
    media: [],
    currentIndex: 0,
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
    isPlayingVideo: false,
  },
  [SIDES.RIGHT]: {
    media: [],
    currentIndex: 0,
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
    isPlayingVideo: false,
  }
};

// Check if a file is a video based on extension
function isVideoFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['mp4', 'webm', 'mov'].includes(ext);
}

// Rotate to next media by toggling active class
function rotateMedia(side) {
  const media = state[side].media;
  if (media.length === 0) return;

  // Don't rotate if a video is currently playing
  if (state[side].isPlayingVideo) return;

  const container = document.getElementById(`${side}-side`);
  const mediaElements = container.querySelectorAll('img, video');

  // Remove active from current
  const currentEl = mediaElements[state[side].currentIndex];
  if (currentEl) {
    currentEl.classList.remove('active');
    // Pause video if it was playing
    if (currentEl.tagName === 'VIDEO') {
      currentEl.pause();
      currentEl.currentTime = 0;
    }
  }

  // Advance index
  state[side].currentIndex = (state[side].currentIndex + 1) % media.length;

  // Add active to new and handle video playback
  const newEl = mediaElements[state[side].currentIndex];
  if (newEl) {
    newEl.classList.add('active');
    if (newEl.tagName === 'VIDEO') {
      state[side].isPlayingVideo = true;
      newEl.play().catch(err => {
        console.warn(`Could not autoplay video on ${side}:`, err);
        state[side].isPlayingVideo = false;
      });
    }
  }
}

// Handle video ended event - advance to next media and reset timer
function handleVideoEnded(side) {
  state[side].isPlayingVideo = false;
  rotateMedia(side);

  // Reset the rotation timer so next image gets full duration
  clearInterval(state[side].rotateTimer);
  state[side].rotateTimer = setInterval(
    () => rotateMedia(side),
    config[side].rotateIntervalSec * 1000
  );
}

// Preload an image and return a promise
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // Still resolve so we don't block others
    img.src = src;
  });
}

// Preload a video (just load metadata)
function preloadVideo(src) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => resolve(video);
    video.src = src;
  });
}

// Render all media (only called when media list changes)
async function renderMedia(side) {
  const container = document.getElementById(`${side}-side`);
  container.innerHTML = "";
  const media = state[side].media;

  if (media.length === 0) {
    container.innerHTML = `<div class="message"></div>`;
    return;
  }

  // Preload all media before displaying
  const preloadPromises = media.map(file => {
    const src = `/uploads/${side}/${file}`;
    return isVideoFile(file) ? preloadVideo(src) : preloadImage(src);
  });
  await Promise.all(preloadPromises);

  // Create and append media elements
  media.forEach((file, idx) => {
    const src = `/uploads/${side}/${file}`;
    let el;

    if (isVideoFile(file)) {
      el = document.createElement('video');
      el.src = src;
      el.muted = true;  // Required for autoplay
      el.playsInline = true;
      el.addEventListener('ended', () => handleVideoEnded(side));
    } else {
      el = document.createElement('img');
      el.src = src;
    }

    if (idx === state[side].currentIndex) {
      el.classList.add('active');
      // Start playing if it's a video
      if (el.tagName === 'VIDEO') {
        state[side].isPlayingVideo = true;
        el.play().catch(err => {
          console.warn(`Could not autoplay video on ${side}:`, err);
          state[side].isPlayingVideo = false;
        });
      }
    }

    container.appendChild(el);
  });
}

// Load media files from server
async function fetchMedia(side) {
  try {
    const response = await fetch(`/api/files?folder=${side}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.warn(`Could not load folder "${side}":`, err);
    return [];
  }
}

// Check if two arrays have the same elements
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Refresh media if changed
async function refreshMedia(side) {
  const newMedia = await fetchMedia(side);
  if (!arraysEqual(newMedia, state[side].media)) {
    state[side].media = newMedia;
    state[side].currentIndex = 0;
    state[side].isPlayingVideo = false;
    renderMedia(side);
  }
}

// Set or update timers only if interval changed
function updateTimers(side) {
  const cfg = config[side];
  const st = state[side];

  // Rotate timer
  if (cfg.rotateIntervalSec !== st.currentRotateInterval) {
    clearInterval(st.rotateTimer);
    st.rotateTimer = setInterval(() => rotateMedia(side), cfg.rotateIntervalSec * 1000);
    st.currentRotateInterval = cfg.rotateIntervalSec;
    console.log(`[${side}] Rotate timer set to ${cfg.rotateIntervalSec}s`);
  }

  // Refresh timer
  if (cfg.refreshIntervalSec !== st.currentRefreshInterval) {
    clearInterval(st.refreshTimer);
    st.refreshTimer = setInterval(() => refreshMedia(side), cfg.refreshIntervalSec * 1000);
    st.currentRefreshInterval = cfg.refreshIntervalSec;
    console.log(`[${side}] Refresh timer set to ${cfg.refreshIntervalSec}s`);
  }
}

// Fetch and apply server config for one side
async function fetchSideConfig(side) {
  try {
    const res = await fetch(`/config?side=${encodeURIComponent(side)}`);
    if (!res.ok) throw new Error('Fetch failed');
    const serverConfig = await res.json();

    config[side].rotateIntervalSec = serverConfig.secondsBetweenImages ?? config[side].rotateIntervalSec;

    updateTimers(side);
  } catch (err) {
    console.warn(`Could not fetch config for ${side}, using defaults.`, err);
  }
}

// Initial setup
async function startSide(side) {
  state[side].media = await fetchMedia(side);
  renderMedia(side);
  updateTimers(side);
}

// Load everything
async function loadConfigs() {
  await Promise.all([
    fetchSideConfig(SIDES.LEFT),
    fetchSideConfig(SIDES.RIGHT)
  ]);

  await startSide(SIDES.LEFT);
  await startSide(SIDES.RIGHT);

  // Refresh config periodically
  setInterval(() => {
    fetchSideConfig(SIDES.LEFT);
    fetchSideConfig(SIDES.RIGHT);
  }, DEFAULT_CONFIG.configPollIntervalMs);
}

loadConfigs();
