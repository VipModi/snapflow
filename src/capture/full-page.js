/**
 * SnapFlow Full-Page Screenshot Engine
 * Performs automated vertical scrolling, sticky element suppression,
 * viewport slice capturing, and HTML5 OffscreenCanvas stitching.
 * 
 * Complies with Manifest V3 and requires only activeTab + scripting permissions.
 */

import { generateFilename } from '../shared/formatters.js';
import { saveCaptureMetadata } from '../storage/metadata-store.js';
import { CAPTURE_TYPES, CAPTURE_SUBTYPES } from '../shared/constants.js';

// Maximum canvas height supported safely across Chromium platforms
export const MAX_CANVAS_HEIGHT = 30000;
export const MAX_CANVAS_AREA = 268435456; // 16384 * 16384

/**
 * Pure calculation helper: Calculate vertical scroll positions
 * @param {number} totalHeight Total scrollable page height
 * @param {number} viewportHeight Visible viewport height
 * @returns {number[]} Array of Y scroll coordinates
 */
export function calculateScrollPositions(totalHeight, viewportHeight) {
  if (totalHeight <= viewportHeight) {
    return [0];
  }
  const positions = [];
  let y = 0;
  while (y + viewportHeight < totalHeight) {
    positions.push(y);
    y += viewportHeight;
  }
  // Add final position aligned to bottom of page
  const finalY = Math.max(0, totalHeight - viewportHeight);
  if (positions.length === 0 || positions[positions.length - 1] !== finalY) {
    positions.push(finalY);
  }
  return positions;
}

/**
 * Pure calculation helper: Determine safe canvas dimensions
 * @param {number} scrollWidth
 * @param {number} scrollHeight
 * @param {number} dpr Device Pixel Ratio
 * @returns {{ width: number, height: number, scaleFactor: number }}
 */
export function calculateCanvasDimensions(scrollWidth, scrollHeight, dpr = 1) {
  const scaledWidth = Math.round(scrollWidth * dpr);
  let scaledHeight = Math.round(scrollHeight * dpr);
  let scaleFactor = 1;

  if (scaledHeight > MAX_CANVAS_HEIGHT) {
    scaleFactor = MAX_CANVAS_HEIGHT / scaledHeight;
    scaledHeight = MAX_CANVAS_HEIGHT;
  }

  return { width: scaledWidth, height: scaledHeight, scaleFactor };
}

/**
 * Convert a Blob to a Data URL (safe for Service Workers without URL.createObjectURL)
 * @param {Blob} blob
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function blobToDataUrl(blob, mimeType = 'image/png') {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Injected script function: Read scroll and viewport dimensions from webpage
 */
function inPageGetDimensions() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0, window.innerWidth);
  const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, window.innerHeight);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const initialScrollX = window.scrollX || window.pageXOffset || 0;
  const initialScrollY = window.scrollY || window.pageYOffset || 0;
  const dpr = window.devicePixelRatio || 1;

  return {
    scrollWidth,
    scrollHeight,
    viewportWidth,
    viewportHeight,
    initialScrollX,
    initialScrollY,
    dpr
  };
}

/**
 * Injected script function: Scroll to specific coordinate
 */
function inPageScrollTo(y) {
  window.scrollTo({ left: 0, top: y, behavior: 'instant' });
}

/**
 * Injected script function: Suppress sticky/fixed elements to avoid repeated headers
 */
function inPageHideFixedElements() {
  const all = document.querySelectorAll('*');
  const hiddenElements = [];
  all.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const orig = el.style.visibility;
      el.setAttribute('data-snapflow-orig-vis', orig);
      el.style.visibility = 'hidden';
      hiddenElements.push(el);
    }
  });
}

/**
 * Injected script function: Restore sticky/fixed elements and initial scroll position
 */
function inPageRestore(initialX, initialY) {
  const elements = document.querySelectorAll('[data-snapflow-orig-vis]');
  elements.forEach((el) => {
    el.style.visibility = el.getAttribute('data-snapflow-orig-vis') || '';
    el.removeAttribute('data-snapflow-orig-vis');
  });
  window.scrollTo({ left: initialX, top: initialY, behavior: 'instant' });
}

/**
 * Helper: Sleep for rendering settle delay
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute Full Page Screenshot capture on the given tab
 * @param {chrome.tabs.Tab} tab Target tab with activeTab permission
 * @param {Object} [options={}]
 * @param {'png'|'jpeg'} [options.format='png']
 * @param {number} [options.quality=90] 1-100 (JPEG only)
 * @returns {Promise<{ filename: string, downloadId: number, width: number, height: number, dataUrl: string }>}
 */
export async function captureFullPage(tab, options = {}) {
  const tabId = tab.id;
  const windowId = tab.windowId;
  const format = options.format === 'jpeg' ? 'jpeg' : 'png';
  const quality = format === 'jpeg' ? Math.max(1, Math.min(100, options.quality || 90)) : undefined;

  // 1. Measure page dimensions via chrome.scripting.executeScript
  const [{ result: pageInfo }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: inPageGetDimensions
  });

  const { scrollWidth, scrollHeight, viewportWidth, viewportHeight, initialScrollX, initialScrollY, dpr } = pageInfo;

  // Edge case: Short page fits entirely in viewport
  if (scrollHeight <= viewportHeight + 5) {
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(windowId, { format, quality }, (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res) return reject(new Error('Empty capture result'));
        resolve(res);
      });
    });

    const filename = generateFilename(new Date(), format);
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({ url: dataUrl, filename, saveAs: false }, (id) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(id);
      });
    });

    let downloadedFilePath = null;
    for (let attempts = 0; attempts < 30; attempts++) {
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (item && item.state === 'complete') {
        downloadedFilePath = item.filename;
        break;
      }
      await sleep(200);
    }

    await saveCaptureMetadata({
      type: CAPTURE_TYPES.SCREENSHOT,
      subtype: CAPTURE_SUBTYPES.FULLPAGE,
      format,
      filename,
      downloadId,
      storageDestination: 'local',
      driveStatus: 'not_uploaded'
    });

    return {
      filename,
      downloadId,
      filePath: downloadedFilePath,
      width: Math.round(viewportWidth * dpr),
      height: Math.round(scrollHeight * dpr),
      dataUrl
    };
  }

  // 2. Multi-slice full-page capture
  const yPositions = calculateScrollPositions(scrollHeight, viewportHeight);
  const slices = [];

  try {
    for (let i = 0; i < yPositions.length; i++) {
      const targetY = yPositions[i];

      // On slices after the first, hide fixed/sticky navigation to prevent duplicates
      if (i === 1) {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: inPageHideFixedElements
        });
      }

      // Scroll to position
      await chrome.scripting.executeScript({
        target: { tabId },
        func: inPageScrollTo,
        args: [targetY]
      });

      // Wait for repainting, lazy-loaded items to settle, and respect Chrome's MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND (2/sec) quota
      await sleep(550);

      // Capture visible slice with rate-limit retry support
      let sliceDataUrl = null;
      let attempts = 0;
      while (!sliceDataUrl && attempts < 3) {
        attempts++;
        try {
          sliceDataUrl = await new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (res) => {
              if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
              if (!res) return reject(new Error('Capture slice returned empty data'));
              resolve(res);
            });
          });
        } catch (err) {
          if (err.message && err.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') && attempts < 3) {
            await sleep(600);
          } else {
            throw err;
          }
        }
      }

      // Convert to ImageBitmap for low-memory canvas drawing
      const res = await fetch(sliceDataUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      slices.push({ bitmap, y: targetY });
    }

    // 3. Composite slices onto canvas
    const { width: canvasWidth, height: canvasHeight } = calculateCanvasDimensions(scrollWidth, scrollHeight, dpr);
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fill white background in case of transparent page margins
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      let destY = Math.round(slice.y * dpr);

      // If last slice, align flush to canvas bottom
      if (i === slices.length - 1 && slices.length > 1) {
        destY = canvasHeight - slice.bitmap.height;
      }

      ctx.drawImage(slice.bitmap, 0, destY);
      slice.bitmap.close(); // Free GPU resource immediately
    }

    // 4. Export composite image
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const outputBlob = await canvas.convertToBlob({
      type: mimeType,
      quality: format === 'jpeg' ? quality / 100 : undefined
    });

    const dataUrl = await blobToDataUrl(outputBlob, mimeType);
    const filename = generateFilename(new Date(), format);

    // 5. Trigger download and wait for disk completion
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({ url: dataUrl, filename, saveAs: false }, (id) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(id);
      });
    });

    // Await download completion state
    let downloadedFilePath = null;
    for (let attempts = 0; attempts < 30; attempts++) {
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (item && item.state === 'complete') {
        downloadedFilePath = item.filename;
        console.log('[SnapFlow] Download completed on disk at:', downloadedFilePath);
        break;
      }
      if (item && item.state === 'interrupted') {
        console.error('[SnapFlow] Download interrupted:', item.error);
        break;
      }
      await sleep(200);
    }

    // 6. Record metadata without URL/title
    await saveCaptureMetadata({
      type: CAPTURE_TYPES.SCREENSHOT,
      subtype: CAPTURE_SUBTYPES.FULLPAGE,
      format,
      filename,
      downloadId,
      fileSizeBytes: outputBlob.size,
      storageDestination: 'local',
      driveStatus: 'not_uploaded'
    });

    return {
      filename,
      downloadId,
      filePath: downloadedFilePath,
      width: canvasWidth,
      height: canvasHeight,
      fileSizeBytes: outputBlob.size,
      dataUrl
    };
  } finally {
    // 7. Always restore page state: unhide sticky elements & restore scroll position
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: inPageRestore,
        args: [initialScrollX, initialScrollY]
      });
    } catch {}

    // Clean up any unclosed bitmaps in case of error
    slices.forEach((s) => {
      try {
        s.bitmap.close();
      } catch {}
    });
  }
}
