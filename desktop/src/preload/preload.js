const { contextBridge, ipcRenderer } = require('electron');

const PUBLIC_CHANNELS = ['hello', 'makeRequest', 'prepareStream', 'openPage', 'updateMediaMetadata', 'openOfflineApp'];

function isLocalOrigin() {
  try {
    return window.location.protocol === 'file:';
  } catch {
    return false;
  }
}

window.addEventListener('message', async (event) => {
  // Security check: only accept messages from the same window
  if (event.source !== window) return;

  const data = event.data;

  // Basic Plasmo relay check
  // We look for messages that have a 'name' that matches our API
  // and are NOT marked as 'relayed' (to avoid infinite loops)
  if (!data || !data.name || data.relayed) return;

  if (PUBLIC_CHANNELS.includes(data.name)) {
    try {
      // Forward to Main Process
      const response = await ipcRenderer.invoke(data.name, data.body);

      // Send response back to window (only if it's not a one-way update like updateMediaMetadata)
      if (data.name !== 'updateMediaMetadata') {
        window.postMessage(
          {
            name: data.name,
            relayId: data.relayId,
            instanceId: data.instanceId,
            body: response,
            relayed: true,
          },
          '*',
        ); // Target origin * is okay here as we validated source === window
      }
    } catch (error) {
      console.error(`[Preload] Error handling ${data.name}:`, error);
      if (data.name !== 'updateMediaMetadata') {
        window.postMessage(
          {
            name: data.name,
            relayId: data.relayId,
            instanceId: data.instanceId,
            body: { success: false, error: error.message },
            relayed: true,
          },
          '*',
        );
      }
    }
  }
});

// Expose flags and APIs so the web app knows it's running in the desktop client
contextBridge.exposeInMainWorld('__ZOG_DESKTOP__', true);
contextBridge.exposeInMainWorld('isDesktopApp', true); // Compatibility alias
contextBridge.exposeInMainWorld('ZOG_DESKTOP', true); // Another common pattern

// Expose function to open settings
contextBridge.exposeInMainWorld('__ZOG_OPEN_SETTINGS__', () => {
  ipcRenderer.send('open-settings');
});

// Expose function to open DevTools for this (embedded) page
contextBridge.exposeInMainWorld('__ZOG_OPEN_DEVTOOLS__', () => {
  ipcRenderer.send('open-embed-devtools');
});

// Expose WARP controls for the "failed to load" error page (turn on WARP, then reload)
contextBridge.exposeInMainWorld('__ZOG_SET_WARP_ENABLED__', (enabled) =>
  ipcRenderer.invoke('set-warp-enabled', enabled),
);
contextBridge.exposeInMainWorld('__ZOG_GET_WARP_STATUS__', () => ipcRenderer.invoke('get-warp-status'));
contextBridge.exposeInMainWorld('__ZOG_RELOAD_STREAM_PAGE__', () => ipcRenderer.invoke('reload-stream-page'));

// When the web app requests desktop settings (e.g. menu → Desktop), open the settings panel
window.addEventListener('zog-desktop-settings', () => {
  ipcRenderer.send('open-settings');
});
console.log('Zog Desktop Preload Loaded');

let lastThemeColor = null;
let themeSendScheduled = false;

const getThemeColor = () => {
  const body = document.body;
  const root = document.documentElement;

  const bodyColor = body ? getComputedStyle(body).backgroundColor : '';
  const rootColor = root ? getComputedStyle(root).backgroundColor : '';

  const isTransparent = (value) => !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';

  if (!isTransparent(bodyColor)) return bodyColor;
  if (!isTransparent(rootColor)) return rootColor;
  return '#1f2025';
};

const sendThemeColor = () => {
  const color = getThemeColor();
  if (color && color !== lastThemeColor) {
    lastThemeColor = color;
    ipcRenderer.send('theme-color', color);
  }
};

const scheduleThemeSend = () => {
  if (themeSendScheduled) return;
  themeSendScheduled = true;
  requestAnimationFrame(() => {
    themeSendScheduled = false;
    sendThemeColor();
  });
};

const observeThemeChanges = () => {
  sendThemeColor();

  const observer = new MutationObserver(() => {
    scheduleThemeSend();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme', 'data-mode'],
    subtree: true,
  });

  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-mode'],
      subtree: true,
    });
  }
};

let zogAudioContext = null;
let zogMasterGain = null;
let zogCurrentBoost = 1.0;

const applyBoostValue = (rawValue) => {
  let value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) value = 1.0;
  value = Math.min(Math.max(value, 1.0), 10.0);
  zogCurrentBoost = value;
  if (zogMasterGain) {
    zogMasterGain.gain.value = zogCurrentBoost;
  }
};

const ensureAudioGraph = () => {
  if (zogAudioContext && zogMasterGain) return;

  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) {
    return;
  }

  try {
    zogAudioContext = new AudioContextImpl();
    zogMasterGain = zogAudioContext.createGain();
    zogMasterGain.gain.value = zogCurrentBoost;
    zogMasterGain.connect(zogAudioContext.destination);
  } catch (error) {
    console.warn('[Zog] Failed to initialise audio context for volume boost:', error);
    zogAudioContext = null;
    zogMasterGain = null;
  }
};

const hookMediaElementForBoost = (el) => {
  if (!el || el.__zogBoosted) return;

  ensureAudioGraph();
  if (!zogAudioContext || !zogMasterGain) return;

  try {
    const sourceNode = zogAudioContext.createMediaElementSource(el);
    const elementGain = zogAudioContext.createGain();
    const initialVolume = typeof el.volume === 'number' ? el.volume : 1.0;
    elementGain.gain.value = initialVolume;

    sourceNode.connect(elementGain).connect(zogMasterGain);

    const resumeContext = () => {
      if (zogAudioContext && zogAudioContext.state === 'suspended') {
        zogAudioContext.resume().catch(() => {});
      }
    };

    el.addEventListener('play', resumeContext);

    const onVolumeChange = () => {
      const vol = typeof el.volume === 'number' ? el.volume : 1.0;
      elementGain.gain.value = vol;
    };
    el.addEventListener('volumechange', onVolumeChange);

    el.__zogBoosted = true;
  } catch (error) {
    console.warn('[Zog] Failed to hook media element for volume boost:', error);
  }
};

const scanAndHookMediaElements = () => {
  try {
    const mediaEls = document.querySelectorAll('audio, video');
    mediaEls.forEach((el) => hookMediaElementForBoost(el));
  } catch (error) {
    console.warn('[Zog] Failed to scan media elements for volume boost:', error);
  }
};

ipcRenderer.on('volume-boost-changed', (_event, value) => {
  applyBoostValue(value);
});

const setupVolumeBoost = async () => {
  try {
    const initialBoost = await ipcRenderer.invoke('get-volume-boost');
    applyBoostValue(initialBoost);
  } catch (error) {
    console.warn('[Zog] Failed to load initial volume boost:', error);
  }

  scanAndHookMediaElements();

  try {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('audio, video')) {
            hookMediaElementForBoost(node);
          }
          const nested = node.querySelectorAll && node.querySelectorAll('audio, video');
          if (nested && nested.length) {
            nested.forEach((el) => hookMediaElementForBoost(el));
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch (error) {
    console.warn('[Zog] Failed to observe media elements for volume boost:', error);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  observeThemeChanges();
  const intervalId = setInterval(sendThemeColor, 10000);
  window.addEventListener(
    'beforeunload',
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );

  setupVolumeBoost();
});
