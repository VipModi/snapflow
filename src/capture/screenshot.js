/**
 * SnapFlow Screenshot Capture Engine
 * Implements viewport screenshot capture using chrome.tabs.captureVisibleTab
 */

/**
 * Capture the visible viewport of the specified window (or active window)
 * @param {number|null} [windowId=null]
 * @param {Object} [options={}]
 * @param {'png'|'jpeg'} [options.format='png']
 * @param {number} [options.quality=90] 1-100 (JPEG only)
 * @returns {Promise<string>} Base64 Data URL
 */
export async function captureVisibleViewport(windowId = null, options = {}) {
  const format = options.format === 'jpeg' ? 'jpeg' : 'png';
  const captureOptions = { format };
  if (format === 'jpeg') {
    captureOptions.quality = Math.max(1, Math.min(100, options.quality || 90));
  }

  // chrome.tabs.captureVisibleTab with activeTab permission
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, captureOptions, (dataUrl) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!dataUrl) {
        return reject(new Error('Failed to capture visible tab: Empty result'));
      }
      resolve(dataUrl);
    });
  });
}

/**
 * Convert a Base64 data URL to an ArrayBuffer or byte length estimate
 * @param {string} dataUrl
 * @returns {number} Approximate byte length
 */
export function estimateDataUrlSize(dataUrl) {
  const base64Index = dataUrl.indexOf(';base64,');
  if (base64Index === -1) return dataUrl.length;
  const base64Str = dataUrl.substring(base64Index + 8);
  // Base64 is 4 chars per 3 bytes, minus padding
  const padding = (base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0);
  return Math.floor((base64Str.length * 3) / 4) - padding;
}
