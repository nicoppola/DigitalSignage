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
  [SIDES.LEFT]: { rotateIntervalSec: DEFAULT_CONFIG.leftRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec, fullscreenMedia: [] },
  [SIDES.RIGHT]: { rotateIntervalSec: DEFAULT_CONFIG.rightRotateIntervalSec, refreshIntervalSec: DEFAULT_CONFIG.refreshIntervalSec, fullscreenMedia: [] }
};

// Fullscreen state
let fullscreenActive = false;
let fullscreenSide = null;
let fullscreenImageTimer = null;

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

  // Don't rotate if fullscreen is active (fullscreen manages its own transitions)
  if (fullscreenActive) return;

  // Don't rotate if a video is currently playing
  if (state[side].isPlayingVideo) return;

  const container = document.getElementById(`${side}-side`);
  const mediaElements = container.querySelectorAll('img, video');

  // Get next index to check if it's fullscreen
  const nextIndex = (state[side].currentIndex + 1) % media.length;
  const nextFile = media[nextIndex];
  const nextEl = mediaElements[nextIndex];
  const nextIsFullscreen = config[side].fullscreenMedia.includes(nextFile);

  // Remove active from current
  const currentEl = mediaElements[state[side].currentIndex];

  // If next is fullscreen, do a staged transition (for both images and videos)
  if (nextIsFullscreen && nextEl) {
    const otherSide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
    const otherPanel = document.getElementById(`${otherSide}-side`);

    // Start BOTH fades at the same time (0.3s each)
    if (currentEl) {
      currentEl.classList.add('ended');
    }
    otherPanel.classList.add('hidden');

    // Mark fullscreen immediately so callers know not to set timers
    fullscreenActive = true;
    fullscreenSide = side;

    // Pause timers now
    clearInterval(state[side].rotateTimer);
    clearInterval(state[otherSide].rotateTimer);

    // Pause other side's video if playing
    const otherVideo = otherPanel.querySelector('video.active');
    if (otherVideo) {
      otherVideo.pause();
    }

    // Wait for both fades to complete (0.3s = 300ms for the longer one)
    setTimeout(() => {
      if (currentEl) {
        currentEl.classList.remove('active');
        currentEl.classList.remove('ended');
        if (currentEl.tagName === 'VIDEO') {
          currentEl.pause();
          currentEl.currentTime = 0;
        }
      }

      // Advance index
      state[side].currentIndex = nextIndex;

      // Now expand to fullscreen (flag already set above)
      const activePanel = document.getElementById(`${side}-side`);
      activePanel.classList.add('fullscreen');

      if (nextEl.tagName === 'VIDEO') {
        // Fullscreen video - play it
        nextEl.classList.add('active');
        nextEl.classList.remove('ended');
        state[side].isPlayingVideo = true;
        nextEl.play().catch(err => {
          console.warn(`Could not autoplay video on ${side}:`, err);
          state[side].isPlayingVideo = false;
        });
      } else {
        // Fullscreen image - start timer and fade in
        fullscreenImageTimer = setTimeout(() => {
          handleFullscreenImageEnded(side);
        }, config[side].rotateIntervalSec * 1000);

        setTimeout(() => {
          nextEl.classList.add('active');
        }, 50);
      }

      console.log(`[${side}] Rotating to fullscreen: ${nextFile}`);
    }, 300); // wait for both fades (0.3s is the longer one)

    return; // exit early, we handled everything
  }

  // Normal flow for non-fullscreen
  if (currentEl) {
    currentEl.classList.remove('active');
    if (currentEl.tagName === 'VIDEO') {
      currentEl.pause();
      currentEl.currentTime = 0;
    }
  }

  // Advance index
  state[side].currentIndex = nextIndex;

  // Add active to new and handle video/image playback
  const newEl = nextEl;
  const currentFile = nextFile;
  if (newEl) {
    console.log(`[${side}] Rotating to: ${currentFile}, isVideo: ${newEl.tagName === 'VIDEO'}`);

    if (newEl.tagName === 'VIDEO') {
      newEl.classList.add('active');
      newEl.classList.remove('ended');
      state[side].isPlayingVideo = true;

      newEl.play().catch(err => {
        console.warn(`Could not autoplay video on ${side}:`, err);
        state[side].isPlayingVideo = false;
      });
    } else {
      // Normal image - just make it active
      newEl.classList.add('active');
    }
  }
}

// Activate fullscreen mode for a side
function activateFullscreen(side, isImage = false) {
  if (fullscreenActive) return;

  fullscreenActive = true;
  fullscreenSide = side;

  const otherSide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
  const activePanel = document.getElementById(`${side}-side`);
  const otherPanel = document.getElementById(`${otherSide}-side`);

  // Expand active panel, hide other
  activePanel.classList.add('fullscreen');
  otherPanel.classList.add('hidden');

  // Pause both sides' rotation timers
  clearInterval(state[side].rotateTimer);
  clearInterval(state[otherSide].rotateTimer);

  // Pause other side's video if playing
  const otherVideo = otherPanel.querySelector('video.active');
  if (otherVideo) {
    otherVideo.pause();
  }

  // For images, set a timer to exit fullscreen after rotate interval
  if (isImage) {
    fullscreenImageTimer = setTimeout(() => {
      handleFullscreenImageEnded(side);
    }, config[side].rotateIntervalSec * 1000);
  }

  console.log(`[${side}] Fullscreen activated (${isImage ? 'image' : 'video'})`);
}

// Deactivate fullscreen mode
function deactivateFullscreen() {
  if (!fullscreenActive) return;

  // Clear image timer if set
  if (fullscreenImageTimer) {
    clearTimeout(fullscreenImageTimer);
    fullscreenImageTimer = null;
  }

  const side = fullscreenSide;
  const otherSide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
  const activePanel = document.getElementById(`${side}-side`);
  const otherPanel = document.getElementById(`${otherSide}-side`);

  // Remove fullscreen classes
  activePanel.classList.remove('fullscreen');
  otherPanel.classList.remove('hidden');

  // Resume other side's rotation timer
  state[otherSide].rotateTimer = setInterval(
    () => rotateMedia(otherSide),
    config[otherSide].rotateIntervalSec * 1000
  );

  // Resume other side's video if it was playing
  const otherVideo = otherPanel.querySelector('video.active');
  if (otherVideo && state[otherSide].isPlayingVideo) {
    otherVideo.play().catch(err => {
      console.warn(`Could not resume video on ${otherSide}:`, err);
    });
  }

  // Force reflow to ensure the other panel is visible
  otherPanel.offsetHeight;

  fullscreenActive = false;
  fullscreenSide = null;

  console.log(`[${side}] Fullscreen deactivated`);
}

// Handle fullscreen image timer ended
function handleFullscreenImageEnded(side) {
  fullscreenImageTimer = null;

  const container = document.getElementById(`${side}-side`);
  const currentImg = container.querySelector('img.active');

  // Start fade out while still in fullscreen
  if (currentImg) {
    currentImg.classList.add('ended');
  }

  // Wait for fade to complete (0.3s)
  setTimeout(() => {
    // Clean up old image
    if (currentImg) {
      currentImg.classList.remove('active');
      currentImg.classList.remove('ended');
    }

    // Advance index
    const media = state[side].media;
    state[side].currentIndex = (state[side].currentIndex + 1) % media.length;

    const mediaElements = container.querySelectorAll('img, video');
    const newEl = mediaElements[state[side].currentIndex];
    const currentFile = media[state[side].currentIndex];
    const shouldBeFullscreen = newEl ? config[side].fullscreenMedia.includes(currentFile) : false;

    // If next is also fullscreen, stay in fullscreen mode
    if (shouldBeFullscreen && newEl) {
      if (newEl.tagName === 'VIDEO') {
        // Transition to fullscreen video (stay fullscreen)
        newEl.classList.add('active');
        newEl.classList.remove('ended');
        state[side].isPlayingVideo = true;
        newEl.play().catch(err => {
          console.warn(`Could not autoplay video on ${side}:`, err);
          state[side].isPlayingVideo = false;
        });
      } else {
        // Transition to another fullscreen image (stay fullscreen)
        fullscreenImageTimer = setTimeout(() => {
          handleFullscreenImageEnded(side);
        }, config[side].rotateIntervalSec * 1000);
        setTimeout(() => {
          newEl.classList.add('active');
        }, 50);
      }
      return; // stay fullscreen, no rotation timer needed
    }

    // Exiting fullscreen - deactivate first, then show new media after transition
    deactivateFullscreen();

    // Small delay to let the panel resize before showing the new image
    setTimeout(() => {
      if (newEl) {
        newEl.classList.add('active');
        newEl.classList.remove('ended');

        if (newEl.tagName === 'VIDEO') {
          state[side].isPlayingVideo = true;
          newEl.play().catch(err => {
            console.warn(`Could not autoplay video on ${side}:`, err);
            state[side].isPlayingVideo = false;
          });
        }
      }

      // Reset the rotation timer so next media gets full duration
      clearInterval(state[side].rotateTimer);
      state[side].rotateTimer = setInterval(
        () => rotateMedia(side),
        config[side].rotateIntervalSec * 1000
      );
    }, 50);
  }, 300); // wait for fade out to complete (0.3s)
}

// Handle video ended event - advance to next media and reset timer
function handleVideoEnded(side) {
  const wasFullscreen = fullscreenActive && fullscreenSide === side;

  state[side].isPlayingVideo = false;

  if (wasFullscreen) {
    // Peek at next item to decide whether to stay fullscreen
    const media = state[side].media;
    const container = document.getElementById(`${side}-side`);
    const mediaElements = container.querySelectorAll('img, video');
    const nextIndex = (state[side].currentIndex + 1) % media.length;
    const nextFile = media[nextIndex];
    const nextEl = mediaElements[nextIndex];
    const nextIsFullscreen = config[side].fullscreenMedia.includes(nextFile);

    if (nextIsFullscreen && nextEl) {
      // Next is also fullscreen - stay fullscreen, just swap media
      const currentEl = mediaElements[state[side].currentIndex];
      if (currentEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('ended');
        if (currentEl.tagName === 'VIDEO') {
          currentEl.pause();
          currentEl.currentTime = 0;
        }
      }

      state[side].currentIndex = nextIndex;

      if (nextEl.tagName === 'VIDEO') {
        nextEl.classList.add('active');
        nextEl.classList.remove('ended');
        state[side].isPlayingVideo = true;
        nextEl.play().catch(err => {
          console.warn(`Could not autoplay video on ${side}:`, err);
          state[side].isPlayingVideo = false;
        });
      } else {
        // Fullscreen image - start timer and fade in
        fullscreenImageTimer = setTimeout(() => {
          handleFullscreenImageEnded(side);
        }, config[side].rotateIntervalSec * 1000);
        setTimeout(() => {
          nextEl.classList.add('active');
        }, 50);
      }
      console.log(`[${side}] Staying fullscreen: ${nextFile}`);
      return;
    }

    // Next is not fullscreen - exit fullscreen then rotate
    deactivateFullscreen();
  }

  // Small delay after fullscreen to let CSS transitions settle
  const rotateDelay = wasFullscreen ? 100 : 0;
  setTimeout(() => {
    rotateMedia(side);

    // Only set rotation timer if rotateMedia didn't enter fullscreen mode
    // (fullscreen manages its own timers)
    if (!fullscreenActive) {
      clearInterval(state[side].rotateTimer);
      state[side].rotateTimer = setInterval(
        () => rotateMedia(side),
        config[side].rotateIntervalSec * 1000
      );
    }
  }, rotateDelay);
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
      el.preload = 'auto';  // Preload full video for smoother playback
      el.addEventListener('ended', () => handleVideoEnded(side));
      el.addEventListener('error', () => {
        console.error(`[${side}] Video failed to load: ${file}`);
        // Treat like video ended - move to next
        state[side].isPlayingVideo = false;
        handleVideoEnded(side);
      });
      // Hide video before it ends to prevent first-frame flash
      // Use polling for more precise timing than timeupdate
      el.addEventListener('play', function() {
        const video = this;
        const checkEnd = () => {
          if (video.paused || video.ended) return;
          const timeLeft = video.duration - video.currentTime;
          if (timeLeft < 0.25 && timeLeft > 0) {
            video.classList.add('ended');
          } else {
            requestAnimationFrame(checkEnd);
          }
        };
        requestAnimationFrame(checkEnd);
      });
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
    config[side].fullscreenMedia = serverConfig.fullscreenMedia ?? [];

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
