/**
 * SnapFlow Settings Store
 * Manages user preferences stored in chrome.storage.local
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants.js';

/**
 * Retrieve current settings merged with default values
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Update user settings
 * @param {Partial<typeof DEFAULT_SETTINGS>} updates
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const next = { ...current, ...updates };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}
