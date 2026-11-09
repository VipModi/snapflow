/**
 * SnapFlow Management Page Controller
 * Handles capture library indexing, preferences, and shortcut references.
 */

import { getAllCaptures, deleteCapture } from '../storage/metadata-store.js';
import { getSettings, updateSettings } from '../storage/settings-store.js';
import { formatBytes } from '../shared/formatters.js';

// DOM References
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const capturesListBody = document.getElementById('capturesListBody');
const emptyLibraryState = document.getElementById('emptyLibraryState');
const btnRefreshLibrary = document.getElementById('btnRefreshLibrary');
const settingImageFormat = document.getElementById('settingImageFormat');
const settingJpegQuality = document.getElementById('settingJpegQuality');
const jpegQualityVal = document.getElementById('jpegQualityVal');
const jpegQualityGroup = document.getElementById('jpegQualityGroup');
const btnConfigureChromeShortcuts = document.getElementById('btnConfigureChromeShortcuts');

// 1. Tab Switching
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetTab = item.dataset.tab;
    navItems.forEach(n => n.classList.remove('active'));
    tabPanes.forEach(p => p.classList.add('hidden'));

    item.classList.add('active');
    const pane = document.getElementById(`tab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
    if (pane) pane.classList.remove('hidden');

    if (targetTab === 'library') {
      loadLibrary();
    }
  });
});

// 2. Load and Render Capture Library
async function loadLibrary() {
  try {
    const captures = await getAllCaptures();
    capturesListBody.innerHTML = '';

    if (!captures || captures.length === 0) {
      emptyLibraryState.classList.remove('hidden');
      return;
    }

    emptyLibraryState.classList.add('hidden');

    captures.forEach(item => {
      const tr = document.createElement('tr');
      const dateFormatted = new Date(item.createdAt).toLocaleString();

      tr.innerHTML = `
        <td><span class="badge badge-active">${escapeHtml(item.subtype || item.type)}</span></td>
        <td><strong>${escapeHtml(item.filename)}</strong></td>
        <td>${escapeHtml(dateFormatted)}</td>
        <td>${escapeHtml(formatBytes(item.fileSizeBytes))}</td>
        <td>Local Downloads</td>
        <td>
          <button class="btn-delete" data-id="${item.id}" title="Remove entry from index">Delete</button>
        </td>
      `;

      // Attach delete listener
      const deleteBtn = tr.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Remove "${item.filename}" from the metadata index? (File remains in your Downloads folder)`)) {
          await deleteCapture(item.id);
          await loadLibrary();
        }
      });

      capturesListBody.appendChild(tr);
    });
  } catch (err) {
    console.error('[SnapFlow Management] Failed to load library:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

btnRefreshLibrary.addEventListener('click', loadLibrary);

// 3. Settings Loading & Saving
async function loadSettingsUI() {
  try {
    const settings = await getSettings();
    settingImageFormat.value = settings.imageFormat || 'png';
    settingJpegQuality.value = settings.jpegQuality || 90;
    jpegQualityVal.textContent = settingJpegQuality.value;

    toggleJpegQualityVisibility(settingImageFormat.value);
  } catch (err) {
    console.error('[SnapFlow Management] Failed to load settings:', err);
  }
}

function toggleJpegQualityVisibility(format) {
  if (format === 'jpeg') {
    jpegQualityGroup.classList.remove('hidden');
  } else {
    jpegQualityGroup.classList.add('hidden');
  }
}

settingImageFormat.addEventListener('change', async (e) => {
  const format = e.target.value;
  toggleJpegQualityVisibility(format);
  await updateSettings({ imageFormat: format });
});

settingJpegQuality.addEventListener('input', (e) => {
  jpegQualityVal.textContent = e.target.value;
});

settingJpegQuality.addEventListener('change', async (e) => {
  await updateSettings({ jpegQuality: parseInt(e.target.value, 10) });
});

// 4. Shortcut Config Button
btnConfigureChromeShortcuts.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadLibrary();
  loadSettingsUI();
});
