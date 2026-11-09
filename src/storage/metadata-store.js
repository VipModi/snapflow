/**
 * SnapFlow Metadata Store
 * Maintains local metadata index in chrome.storage.local for the Management Library.
 * 
 * CRITICAL PRIVACY RULE (D-17 & SF-FR-022):
 * Neither page URL nor page title is ever stored in capture metadata.
 */

import { STORAGE_KEYS } from '../shared/constants.js';

/**
 * @typedef {Object} CaptureMetadata
 * @property {string} id Unique identifier
 * @property {'screenshot'|'gif'|'video'} type
 * @property {string} subtype e.g. 'visible_viewport', 'full_page'
 * @property {string} format 'png', 'jpeg', 'webm', 'gif'
 * @property {string} filename Output file name
 * @property {number} [downloadId] Chrome download ID
 * @property {string} createdAt ISO 8601 timestamp
 * @property {number} [fileSizeBytes] File size in bytes
 * @property {'local'|'drive'|'both'} storageDestination
 * @property {'not_uploaded'|'uploading'|'uploaded'|'failed'} driveStatus
 * @property {string} [driveFileId] Google Drive file ID if uploaded
 */

/**
 * Retrieve all capture metadata records from chrome.storage.local
 * @returns {Promise<CaptureMetadata[]>}
 */
export async function getAllCaptures() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CAPTURES);
  return result[STORAGE_KEYS.CAPTURES] || [];
}

/**
 * Save a new capture metadata record to the local index
 * @param {Omit<CaptureMetadata, 'id'|'createdAt'>} item
 * @returns {Promise<CaptureMetadata>}
 */
export async function saveCaptureMetadata(item) {
  const list = await getAllCaptures();
  
  // Enforce Privacy Rule: strip any accidental url or title fields
  const sanitized = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: item.type,
    subtype: item.subtype,
    format: item.format,
    filename: item.filename,
    downloadId: item.downloadId || null,
    createdAt: new Date().toISOString(),
    fileSizeBytes: item.fileSizeBytes || 0,
    storageDestination: item.storageDestination || 'local',
    driveStatus: item.driveStatus || 'not_uploaded',
    driveFileId: item.driveFileId || null
  };

  list.unshift(sanitized); // Most recent first
  await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURES]: list });
  return sanitized;
}

/**
 * Delete a capture metadata entry by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteCapture(id) {
  const list = await getAllCaptures();
  const filtered = list.filter(item => item.id !== id);
  if (filtered.length !== list.length) {
    await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURES]: filtered });
    return true;
  }
  return false;
}

/**
 * Update capture status (e.g. after Google Drive upload)
 * @param {string} id
 * @param {Partial<CaptureMetadata>} updates
 * @returns {Promise<CaptureMetadata|null>}
 */
export async function updateCapture(id, updates) {
  const list = await getAllCaptures();
  const idx = list.findIndex(item => item.id === id);
  if (idx === -1) return null;

  // Sanitize updates to prevent injection of sensitive page data
  const { url, title, ...safeUpdates } = updates;
  list[idx] = { ...list[idx], ...safeUpdates };
  await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURES]: list });
  return list[idx];
}
