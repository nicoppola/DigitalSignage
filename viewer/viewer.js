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
  fadeMs: 500,
};

const config = {
  [SIDES.LEFT]: { rotateIntervalSec: DEFAULT_CONFIG.leftRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec, fullscreenMedia: [] },
  [SIDES.RIGHT]: { rotateIntervalSec: DEFAULT_CONFIG.rightRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec, fullscreenMedia: [] },
};

// Fullscreen state
let fullscreenActive = false;
let fullscreenSide = null;
let fullscreenImageTimer = null;
let fullscreenActiveSlot = 'a';

// Per-side state
const state = {
  [SIDES.LEFT]: {
    mediaList: [],
    currentIndex: 0,
    activeSlot: 'a',
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
    isPlayingVideo: false,
    pausedVideoTime: null,
  },
  [SIDES.RIGHT]: {
    mediaList: [],
    currentIndex: 0,
    activeSlot: 'a',
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
    isPlayingVideo: false,
    pausedVideoTime: null,
  },
};

// Check if a file is a video based on extension
function isVideoFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['mp4', 'webm', 'mov'].includes(ext);
}

// Get the slot DOM element for a side
function getSlotEl(side, slot) {
  return document.getElementById(`${side}-slot-${slot}`);
}

// Get the fullscreen slot DOM element
function getFsSlotEl(slot) {
  return document.getElementById(`fs-slot-${slot}`);
}

// Get the inactive slot id
function inactiveSlot(activeSlot) {
  return activeSlot === 'a' ? 'b' : 'a';
}

// Clear a slot's contents and free memory
function clearSlot(slotEl) {
  const video = slotEl.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load(); // Force release of video resources
  }
  slotEl.innerHTML = '';
}

// Load media into a slot, returns a promise that resolves when ready
function loadMediaIntoSlot(slotEl, filename, side) {
  clearSlot(slotEl);

  const src = `/uploads/${side}/${filename}`;

  return new Promise((resolve) => {
    if (isVideoFile(filename)) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = src;
      video.oncanplay = () => resolve(video);
      video.onerror = () => {
        console.error(`[${side}] Video failed to load: ${filename}`);
        resolve(video);
      };
      slotEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      slotEl.appendChild(img);
    }
  });
}

// Load media into a fullscreen slot (uses full viewport path)
function loadMediaIntoFsSlot(slotEl, filename, side) {
  clearSlot(slotEl);

  const src = `/uploads/${side}/${filename}`;

  return new Promise((resolve) => {
    if (isVideoFile(filename)) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = src;
      video.oncanplay = () => resolve(video);
      video.onerror = () => {
        console.error(`[${side}] Fullscreen video failed to load: ${filename}`);
        resolve(video);
      };
      slotEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      slotEl.appendChild(img);
    }
  });
}

// Set up video end detection — pauses video before natural end to prevent first-frame flash
function setupVideoEndDetection(video, onEnded) {
  let ended = false;

  const checkEnd = () => {
    if (ended || video.paused || video.ended) return;
    const timeLeft = video.duration - video.currentTime;
    if (timeLeft < 0.3 && timeLeft > 0) {
      ended = true;
      video.pause(); // Freeze on current frame — prevents first-frame flash

      // Find the parent slot and fade it out
      const slot = video.closest('.slot');
      if (slot) {
        slot.classList.add('ended');
      }

      // After fade completes, trigger the ended handler
      setTimeout(() => onEnded(), DEFAULT_CONFIG.fadeMs);
      return;
    }
    requestAnimationFrame(checkEnd);
  };

  video.addEventListener('play', () => {
    ended = false;
    requestAnimationFrame(checkEnd);
  });

  // Safety net: if video ends naturally (e.g., very short video where rAF misses it)
  video.addEventListener('ended', () => {
    if (!ended) {
      ended = true;
      onEnded();
    }
  });
}

// Rotate to next media on a side (normal, non-fullscreen)
async function rotateMedia(side) {
  const st = state[side];
  const media = st.mediaList;
  if (media.length === 0) return;

  // Don't rotate if fullscreen is active or video is playing
  if (fullscreenActive) return;
  if (st.isPlayingVideo) return;

  const nextIndex = (st.currentIndex + 1) % media.length;
  const nextFile = media[nextIndex];
  const nextIsFullscreen = config[side].fullscreenMedia.includes(nextFile);

  // If next media should be fullscreen, hand off to enterFullscreen
  if (nextIsFullscreen) {
    st.currentIndex = nextIndex;
    enterFullscreen(side, nextIndex);
    return;
  }

  // Normal rotation: load next into inactive slot, crossfade
  const nextSlotId = inactiveSlot(st.activeSlot);
  const currentSlotEl = getSlotEl(side, st.activeSlot);
  const nextSlotEl = getSlotEl(side, nextSlotId);

  await loadMediaIntoSlot(nextSlotEl, nextFile, side);

  // Wait for the browser to paint the new image before starting the transition
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // Update state
  st.currentIndex = nextIndex;
  st.activeSlot = nextSlotId;

  // Crossfade: new fades in on top of old simultaneously
  nextSlotEl.classList.remove('ended');
  nextSlotEl.classList.add('active');
  currentSlotEl.classList.remove('active');

  // Clean up old slot after fade completes
  setTimeout(() => {
    clearSlot(currentSlotEl);
    currentSlotEl.classList.remove('ended');
  }, DEFAULT_CONFIG.fadeMs + 50);

  // If new media is video, play it
  const videoEl = nextSlotEl.querySelector('video');
  if (videoEl) {
    st.isPlayingVideo = true;
    setupVideoEndDetection(videoEl, () => handleVideoEnded(side));
    videoEl.play().catch(err => {
      console.warn(`[${side}] Could not autoplay video:`, err);
      st.isPlayingVideo = false;
    });
  }

  console.log(`[${side}] Rotated to: ${nextFile}`);
}

// Handle non-fullscreen video ended
function handleVideoEnded(side) {
  state[side].isPlayingVideo = false;
  rotateMedia(side);

  // Reset rotation timer so next rotation is a full interval from now
  if (!fullscreenActive) {
    clearInterval(state[side].rotateTimer);
    state[side].rotateTimer = setInterval(
      () => rotateMedia(side),
      config[side].rotateIntervalSec * 1000
    );
  }
}

// Enter fullscreen mode
async function enterFullscreen(side, mediaIndex) {
  if (fullscreenActive) return;

  fullscreenActive = true;
  fullscreenSide = side;

  const otherSide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
  const filename = state[side].mediaList[mediaIndex];

  // Clear both rotation timers
  clearInterval(state[side].rotateTimer);
  clearInterval(state[otherSide].rotateTimer);

  // Pause other side's video if playing (save position for resume)
  const otherActiveSlot = getSlotEl(otherSide, state[otherSide].activeSlot);
  const otherVideo = otherActiveSlot.querySelector('video');
  if (otherVideo && state[otherSide].isPlayingVideo) {
    state[otherSide].pausedVideoTime = otherVideo.currentTime;
    otherVideo.pause();
  }

  // Fade out both panels simultaneously
  const leftPanel = document.getElementById('left-side');
  const rightPanel = document.getElementById('right-side');
  leftPanel.classList.add('fading-out');
  rightPanel.classList.add('fading-out');

  // Load media into fullscreen overlay slot while panels are fading
  const fsSlotEl = getFsSlotEl(fullscreenActiveSlot);
  await loadMediaIntoFsSlot(fsSlotEl, filename, side);

  // Show fullscreen overlay and slot immediately — crossfade overlaps with panel fade-out
  const overlay = document.getElementById('fullscreen-overlay');
  overlay.classList.add('active');
  fsSlotEl.classList.remove('ended');
  fsSlotEl.classList.add('active');

  // Wait for transition to complete before starting playback
  await delay(DEFAULT_CONFIG.fadeMs);

  // Play video or set image timer
  const videoEl = fsSlotEl.querySelector('video');
  if (videoEl) {
    setupVideoEndDetection(videoEl, () => handleFullscreenMediaEnded());
    videoEl.play().catch(err => {
      console.warn(`[${side}] Could not play fullscreen video:`, err);
      handleFullscreenMediaEnded();
    });
  } else {
    fullscreenImageTimer = setTimeout(() => {
      handleFullscreenMediaEnded();
    }, config[side].rotateIntervalSec * 1000);
  }

  console.log(`[${side}] Entered fullscreen: ${filename}`);
}

// Handle fullscreen media ended — check if next is also fullscreen
async function handleFullscreenMediaEnded() {
  if (!fullscreenActive) return;

  const side = fullscreenSide;
  const media = state[side].mediaList;
  const nextIndex = (state[side].currentIndex + 1) % media.length;
  const nextFile = media[nextIndex];
  const nextIsFullscreen = config[side].fullscreenMedia.includes(nextFile);

  if (nextIsFullscreen) {
    // Stay in fullscreen — crossfade to next media within overlay
    state[side].currentIndex = nextIndex;

    const nextFsSlot = inactiveSlot(fullscreenActiveSlot);
    const currentFsSlotEl = getFsSlotEl(fullscreenActiveSlot);
    const nextFsSlotEl = getFsSlotEl(nextFsSlot);

    await loadMediaIntoFsSlot(nextFsSlotEl, nextFile, side);

    // Crossfade within overlay
    nextFsSlotEl.classList.remove('ended');
    nextFsSlotEl.classList.add('active');
    currentFsSlotEl.classList.remove('active');

    fullscreenActiveSlot = nextFsSlot;

    // Clean up old slot
    setTimeout(() => {
      clearSlot(currentFsSlotEl);
      currentFsSlotEl.classList.remove('ended');
    }, DEFAULT_CONFIG.fadeMs + 50);

    // Play video or set image timer
    const videoEl = nextFsSlotEl.querySelector('video');
    if (videoEl) {
      setupVideoEndDetection(videoEl, () => handleFullscreenMediaEnded());
      videoEl.play().catch(err => {
        console.warn(`[${side}] Could not play fullscreen video:`, err);
        handleFullscreenMediaEnded();
      });
    } else {
      fullscreenImageTimer = setTimeout(() => {
        handleFullscreenMediaEnded();
      }, config[side].rotateIntervalSec * 1000);
    }

    console.log(`[${side}] Staying fullscreen: ${nextFile}`);
  } else {
    // Exit fullscreen
    state[side].currentIndex = nextIndex;
    exitFullscreen();
  }
}

// Exit fullscreen — fade out overlay, fade in both panels
async function exitFullscreen() {
  if (!fullscreenActive) return;

  // Clear image timer if active
  if (fullscreenImageTimer) {
    clearTimeout(fullscreenImageTimer);
    fullscreenImageTimer = null;
  }

  const side = fullscreenSide;
  const otherSide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;

  // Load next media for the fullscreen side into its active panel slot (while overlay still visible)
  const nextFile = state[side].mediaList[state[side].currentIndex];
  if (nextFile) {
    const sideSlotEl = getSlotEl(side, state[side].activeSlot);
    await loadMediaIntoSlot(sideSlotEl, nextFile, side);
    sideSlotEl.classList.remove('ended');
    sideSlotEl.classList.add('active');
  }

  // Resume other side's video if it was paused
  if (state[otherSide].pausedVideoTime !== null) {
    const otherSlotEl = getSlotEl(otherSide, state[otherSide].activeSlot);
    const otherVideo = otherSlotEl.querySelector('video');
    if (otherVideo) {
      otherVideo.currentTime = state[otherSide].pausedVideoTime;
    }
  }

  // Fade out overlay AND fade in panels simultaneously — no black gap
  const activeFsSlotEl = getFsSlotEl(fullscreenActiveSlot);
  const overlay = document.getElementById('fullscreen-overlay');
  const leftPanel = document.getElementById('left-side');
  const rightPanel = document.getElementById('right-side');

  activeFsSlotEl.classList.add('ended');
  overlay.classList.remove('active');
  leftPanel.classList.remove('fading-out');
  rightPanel.classList.remove('fading-out');

  // Wait for crossfade to complete
  await delay(DEFAULT_CONFIG.fadeMs);

  // Clean up overlay
  activeFsSlotEl.classList.remove('active', 'ended');
  clearSlot(activeFsSlotEl);
  fullscreenActiveSlot = 'a';

  // Start video playback after panels are visible
  if (nextFile) {
    const sideSlotEl = getSlotEl(side, state[side].activeSlot);
    const videoEl = sideSlotEl.querySelector('video');
    if (videoEl) {
      state[side].isPlayingVideo = true;
      setupVideoEndDetection(videoEl, () => handleVideoEnded(side));
      videoEl.play().catch(err => {
        console.warn(`[${side}] Could not play video after fullscreen:`, err);
        state[side].isPlayingVideo = false;
      });
    }
  }

  // Resume other side's video
  if (state[otherSide].pausedVideoTime !== null) {
    const otherSlotEl = getSlotEl(otherSide, state[otherSide].activeSlot);
    const otherVideo = otherSlotEl.querySelector('video');
    if (otherVideo) {
      state[otherSide].isPlayingVideo = true;
      setupVideoEndDetection(otherVideo, () => handleVideoEnded(otherSide));
      otherVideo.play().catch(err => {
        console.warn(`[${otherSide}] Could not resume video:`, err);
        state[otherSide].isPlayingVideo = false;
      });
    }
    state[otherSide].pausedVideoTime = null;
  }

  // Clear fullscreen state
  fullscreenActive = false;
  fullscreenSide = null;

  // Resume rotation timers for both sides
  clearInterval(state[side].rotateTimer);
  state[side].rotateTimer = setInterval(
    () => rotateMedia(side),
    config[side].rotateIntervalSec * 1000
  );
  clearInterval(state[otherSide].rotateTimer);
  state[otherSide].rotateTimer = setInterval(
    () => rotateMedia(otherSide),
    config[otherSide].rotateIntervalSec * 1000
  );

  console.log(`[${side}] Exited fullscreen`);
}

// Utility: delay promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  if (!arraysEqual(newMedia, state[side].mediaList)) {
    state[side].mediaList = newMedia;
    state[side].currentIndex = 0;
    state[side].isPlayingVideo = false;
    state[side].pausedVideoTime = null;

    // Load first media into active slot
    if (newMedia.length > 0) {
      const slotEl = getSlotEl(side, state[side].activeSlot);
      await loadMediaIntoSlot(slotEl, newMedia[0], side);
      slotEl.classList.remove('ended');
      slotEl.classList.add('active');

      // Clear the other slot
      const otherSlotEl = getSlotEl(side, inactiveSlot(state[side].activeSlot));
      clearSlot(otherSlotEl);
      otherSlotEl.classList.remove('active', 'ended');

      // If first item is video, play it
      const videoEl = slotEl.querySelector('video');
      if (videoEl) {
        state[side].isPlayingVideo = true;
        setupVideoEndDetection(videoEl, () => handleVideoEnded(side));
        videoEl.play().catch(err => {
          console.warn(`[${side}] Could not autoplay video:`, err);
          state[side].isPlayingVideo = false;
        });
      }
    } else {
      // No media — clear both slots
      clearSlot(getSlotEl(side, 'a'));
      clearSlot(getSlotEl(side, 'b'));
      getSlotEl(side, 'a').classList.remove('active', 'ended');
      getSlotEl(side, 'b').classList.remove('active', 'ended');
    }

    console.log(`[${side}] Media refreshed: ${newMedia.length} files`);
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
    config[side].fullscreenMedia = serverConfig.fullscreenMedia ?? [];

    updateTimers(side);
  } catch (err) {
    console.warn(`Could not fetch config for ${side}, using defaults.`, err);
  }
}

// Initial setup for one side
async function startSide(side) {
  const media = await fetchMedia(side);
  state[side].mediaList = media;

  if (media.length > 0) {
    // Check if first item should be fullscreen
    if (config[side].fullscreenMedia.includes(media[0])) {
      enterFullscreen(side, 0);
      return;
    }

    // Load first media into slot-a
    const slotEl = getSlotEl(side, 'a');
    await loadMediaIntoSlot(slotEl, media[0], side);
    slotEl.classList.add('active');
    state[side].activeSlot = 'a';

    // If first item is video, play it
    const videoEl = slotEl.querySelector('video');
    if (videoEl) {
      state[side].isPlayingVideo = true;
      setupVideoEndDetection(videoEl, () => handleVideoEnded(side));
      videoEl.play().catch(err => {
        console.warn(`[${side}] Could not autoplay video:`, err);
        state[side].isPlayingVideo = false;
      });
    }
  }

  updateTimers(side);
}

// Detect server restart and reload the page
let serverStartId = null;
async function watchForRestart() {
  try {
    const res = await fetch('/api/server-id');
    if (res.ok) {
      const data = await res.json();
      if (serverStartId === null) {
        serverStartId = data.id;
      } else if (data.id !== serverStartId) {
        console.log('Server restarted, reloading viewer...');
        location.reload();
      }
    }
  } catch {
    // Server is down (restarting) — ignore, will catch it next poll
  }
}
setInterval(watchForRestart, 5000);

// Load everything
async function init() {
  await Promise.all([
    fetchSideConfig(SIDES.LEFT),
    fetchSideConfig(SIDES.RIGHT),
  ]);

  await startSide(SIDES.LEFT);
  await startSide(SIDES.RIGHT);

  // Refresh config periodically
  setInterval(() => {
    fetchSideConfig(SIDES.LEFT);
    fetchSideConfig(SIDES.RIGHT);
  }, DEFAULT_CONFIG.configPollIntervalMs);
}

init();
