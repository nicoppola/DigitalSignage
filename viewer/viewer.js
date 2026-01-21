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
    images: [],
    currentIndex: 0,
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
  },
  [SIDES.RIGHT]: {
    images: [],
    currentIndex: 0,
    rotateTimer: null,
    refreshTimer: null,
    currentRotateInterval: null,
    currentRefreshInterval: null,
  }
};

// Rotate to next image by toggling active class
function rotateImage(side) {
  const images = state[side].images;
  if (images.length === 0) return;

  const container = document.getElementById(`${side}-side`);
  const imgElements = container.querySelectorAll('img');

  // Remove active from current
  imgElements[state[side].currentIndex]?.classList.remove('active');

  // Advance index
  state[side].currentIndex = (state[side].currentIndex + 1) % images.length;

  // Add active to new
  imgElements[state[side].currentIndex]?.classList.add('active');
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

// Render all images (only called when image list changes)
async function renderImages(side) {
  const container = document.getElementById(`${side}-side`);
  container.innerHTML = "";
  const images = state[side].images;

  if (images.length === 0) {
    container.innerHTML = `<div class="message"></div>`;
    return;
  }

  // Preload all images before displaying
  const srcs = images.map(file => `/uploads/${side}/${file}`);
  await Promise.all(srcs.map(preloadImage));

  // Now create and append the img elements
  images.forEach((file, idx) => {
    const img = document.createElement("img");
    img.src = `/uploads/${side}/${file}`;
    if (idx === state[side].currentIndex) img.classList.add("active");
    container.appendChild(img);
  });
}

// Load images from server
async function fetchImages(side) {
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

// Refresh images if changed
async function refreshImages(side) {
  const newImages = await fetchImages(side);
  if (!arraysEqual(newImages, state[side].images)) {
    state[side].images = newImages;
    state[side].currentIndex = 0;
    renderImages(side);
  }
}

// Set or update timers only if interval changed
function updateTimers(side) {
  const cfg = config[side];
  const st = state[side];

  // Rotate timer
  if (cfg.rotateIntervalSec !== st.currentRotateInterval) {
    clearInterval(st.rotateTimer);
    st.rotateTimer = setInterval(() => rotateImage(side), cfg.rotateIntervalSec * 1000);
    st.currentRotateInterval = cfg.rotateIntervalSec;
    console.log(`[${side}] Rotate timer set to ${cfg.rotateIntervalSec}s`);
  }

  // Refresh timer
  if (cfg.refreshIntervalSec !== st.currentRefreshInterval) {
    clearInterval(st.refreshTimer);
    st.refreshTimer = setInterval(() => refreshImages(side), cfg.refreshIntervalSec * 1000);
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
  state[side].images = await fetchImages(side);
  renderImages(side);
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
