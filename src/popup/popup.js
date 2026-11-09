/**
 * SnapFlow Popup Controller
 * Manages user triggers for viewport capture, clipboard copy, and navigation.
 */

import { ACTIONS } from '../shared/constants.js';
import { getSettings, updateSettings } from '../storage/settings-store.js';

// DOM Element references
const btnCaptureViewport = document.getElementById('btnCaptureViewport');
const btnCaptureFullPage = document.getElementById('btnCaptureFullPage');
const btnCopyClipboard = document.getElementById('btnCopyClipboard');
const btnOpenManagement = document.getElementById('btnOpenManagement');
const btnViewLibrary = document.getElementById('btnViewLibrary');
const statusBanner = document.getElementById('statusBanner');
const statusMessage = document.getElementById('statusMessage');
const statusIcon = document.getElementById('statusIcon');
const formatRadios = document.querySelectorAll('input[name="formatOption"]');

/**
 * Display a user feedback message in the banner
 * @param {'loading'|'success'|'error'} type
 * @param {string} msg
 */
function showStatus(type, msg) {
  statusBanner.className = `status-banner ${type}`;
  statusMessage.textContent = msg;
  if (type === 'loading') {
    statusIcon.textContent = '⏳';
  } else if (type === 'success') {
    statusIcon.textContent = '✓';
  } else if (type === 'error') {
    statusIcon.textContent = '⚠';
  }
}

function clearStatus() {
  statusBanner.className = 'status-banner hidden';
  statusMessage.textContent = '';
  statusIcon.textContent = '';
}

/**
 * Get the currently selected image format
 * @returns {'png'|'jpeg'}
 */
function getSelectedFormat() {
  const checked = document.querySelector('input[name="formatOption"]:checked');
  return checked ? checked.value : 'png';
}

/**
 * Convert Base64 data URL to Image Blob for Clipboard API
 * @param {string} dataUrl
 * @returns {Promise<Blob>}
 */
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

// 1. Initialize UI with saved settings
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await getSettings();
    if (settings.imageFormat) {
      const targetRadio = document.querySelector(`input[name="formatOption"][value="${settings.imageFormat}"]`);
      if (targetRadio) targetRadio.checked = true;
    }
  } catch (err) {
    console.error('[SnapFlow Popup] Error loading settings:', err);
  }
});

// Update settings when format radio changes
formatRadios.forEach(radio => {
  radio.addEventListener('change', async (e) => {
    try {
      await updateSettings({ imageFormat: e.target.value });
    } catch (err) {
      console.error('[SnapFlow Popup] Error updating format setting:', err);
    }
  });
});

// 2. Handle Visible Viewport Screenshot (MVP Priority)
btnCaptureViewport.addEventListener('click', async () => {
  const format = getSelectedFormat();
  showStatus('loading', 'Capturing tab and saving...');
  btnCaptureViewport.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: ACTIONS.CAPTURE_VIEWPORT,
      options: { format }
    });

    if (response && response.success) {
      showStatus('success', `Saved ${response.filename} to Downloads`);
      // Auto-clear success after 4 seconds
      setTimeout(() => {
        btnCaptureViewport.disabled = false;
      }, 500);
    } else {
      const errorMsg = response?.error || 'Capture failed';
      showStatus('error', errorMsg);
      btnCaptureViewport.disabled = false;
    }
  } catch (err) {
    console.error('[SnapFlow Popup] Capture error:', err);
    showStatus('error', err.message || 'Error communicating with extension worker');
    btnCaptureViewport.disabled = false;
  }
});

// 3. Handle Full-Page Screenshot (Phase 2 Milestone)
if (btnCaptureFullPage) {
  btnCaptureFullPage.addEventListener('click', async () => {
    const format = getSelectedFormat();
    showStatus('loading', 'Scrolling and stitching full page...');
    btnCaptureViewport.disabled = true;
    btnCaptureFullPage.disabled = true;

    try {
      console.log('[SnapFlow Popup] Sending CAPTURE_FULLPAGE message...');
      const response = await chrome.runtime.sendMessage({
        action: ACTIONS.CAPTURE_FULLPAGE,
        options: { format }
      });
      console.log('[SnapFlow Popup] Received response:', JSON.stringify(response));
      window.__lastCaptureResponse = response;

      if (response && response.success) {
        showStatus('success', `Saved ${response.filename} (${response.width}x${response.height}px)`);
        setTimeout(() => {
          btnCaptureViewport.disabled = false;
          btnCaptureFullPage.disabled = false;
        }, 800);
      } else {
        const errorMsg = response?.error || 'Full-page capture failed';
        showStatus('error', errorMsg);
        btnCaptureViewport.disabled = false;
        btnCaptureFullPage.disabled = false;
      }
    } catch (err) {
      console.error('[SnapFlow Popup] Full page error:', err);
      showStatus('error', err.message || 'Error communicating with extension worker');
      btnCaptureViewport.disabled = false;
      btnCaptureFullPage.disabled = false;
    }
  });
}

// 4. Handle Copy to Clipboard (D-16 / SF-FR-007)
btnCopyClipboard.addEventListener('click', async () => {
  showStatus('loading', 'Capturing tab for clipboard...');
  btnCopyClipboard.disabled = true;

  try {
    // Capture as PNG for clipboard compatibility
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (res) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!res) return reject(new Error('Empty capture result'));
        resolve(res);
      });
    });

    const blob = await dataUrlToBlob(dataUrl);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    showStatus('success', 'Screenshot copied to clipboard!');
  } catch (err) {
    console.error('[SnapFlow Popup] Clipboard copy error:', err);
    showStatus('error', err.message || 'Failed to copy to clipboard');
  } finally {
    btnCopyClipboard.disabled = false;
  }
});

// 4. Navigation to Management Page
const openManagementPage = () => {
  chrome.runtime.openOptionsPage();
};

btnOpenManagement.addEventListener('click', openManagementPage);
btnViewLibrary.addEventListener('click', openManagementPage);
