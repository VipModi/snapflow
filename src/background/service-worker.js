/**
 * SnapFlow Background Service Worker (Manifest V3)
 * Coordinates screenshot capture, download pipeline, shortcuts and management page.
 */

import { ACTIONS, DEFAULT_SETTINGS, CAPTURE_TYPES, CAPTURE_SUBTYPES } from '../shared/constants.js';
import { generateFilename } from '../shared/formatters.js';
import { getSettings, updateSettings } from '../storage/settings-store.js';
import { saveCaptureMetadata } from '../storage/metadata-store.js';
import { captureVisibleViewport, estimateDataUrlSize } from '../capture/screenshot.js';

// Initialize default settings on extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SnapFlow ServiceWorker] Installed reason:', details.reason);
  const current = await getSettings();
  await updateSettings(current);
});

/**
 * Handle visible viewport screenshot capture and download
 * @param {Object} [customOptions={}]
 * @returns {Promise<{ success: boolean, filename: string, downloadId: number, dataUrl: string }>}
 */
async function handleViewportCapture(customOptions = {}) {
  const settings = await getSettings();
  const format = customOptions.format || settings.imageFormat || 'png';
  const quality = customOptions.quality || settings.jpegQuality || 90;

  // 1. Capture visible tab
  const dataUrl = await captureVisibleViewport(null, { format, quality });
  const filename = generateFilename(new Date(), format);
  const fileSizeBytes = estimateDataUrlSize(dataUrl);

  // 2. Trigger Chrome download
  const downloadId = await new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (id) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(id);
    });
  });

  // 3. Persist capture metadata (WITHOUT URL/title per privacy rule D-17)
  const meta = await saveCaptureMetadata({
    type: CAPTURE_TYPES.SCREENSHOT,
    subtype: CAPTURE_SUBTYPES.VIEWPORT,
    format: format,
    filename: filename,
    downloadId: downloadId,
    fileSizeBytes: fileSizeBytes,
    storageDestination: 'local',
    driveStatus: 'not_uploaded'
  });

  console.log('[SnapFlow ServiceWorker] Viewport captured & downloaded:', filename, 'ID:', downloadId);

  return {
    success: true,
    filename,
    downloadId,
    metadataId: meta.id,
    dataUrl
  };
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  switch (message.action) {
    case ACTIONS.CAPTURE_VIEWPORT:
      handleViewportCapture(message.options)
        .then(result => sendResponse(result))
        .catch(err => {
          console.error('[SnapFlow ServiceWorker] Capture error:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep message channel open for async response

    case ACTIONS.OPEN_MANAGEMENT:
      chrome.runtime.openOptionsPage(() => {
        sendResponse({ success: true });
      });
      return true;

    default:
      return false;
  }
});

// Keyboard shortcut command listener
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[SnapFlow ServiceWorker] Command received:', command);
  if (command === 'capture_viewport') {
    try {
      await handleViewportCapture();
    } catch (err) {
      console.error('[SnapFlow ServiceWorker] Shortcut capture failed:', err);
    }
  }
});
