/**
 * SnapFlow Shared Constants & Message Actions
 * Aligned with confirmed product decisions D-01 through D-19.
 */

export const ACTIONS = {
  CAPTURE_VIEWPORT: 'SNAPFLOW_CAPTURE_VIEWPORT',
  CAPTURE_FULLPAGE: 'SNAPFLOW_CAPTURE_FULLPAGE',
  CAPTURE_REGION: 'SNAPFLOW_CAPTURE_REGION',
  COPY_CLIPBOARD: 'SNAPFLOW_COPY_CLIPBOARD',
  GET_RECORDING_STATE: 'SNAPFLOW_GET_RECORDING_STATE',
  START_RECORDING: 'SNAPFLOW_START_RECORDING',
  STOP_RECORDING: 'SNAPFLOW_STOP_RECORDING',
  PAUSE_RECORDING: 'SNAPFLOW_PAUSE_RECORDING',
  RESUME_RECORDING: 'SNAPFLOW_RESUME_RECORDING',
  OPEN_MANAGEMENT: 'SNAPFLOW_OPEN_MANAGEMENT'
};

export const STORAGE_KEYS = {
  SETTINGS: 'snapflow_settings',
  CAPTURES: 'snapflow_captures_index'
};

export const DEFAULT_SETTINGS = {
  imageFormat: 'png',        // 'png' (default, D-18) or 'jpeg'
  jpegQuality: 90,           // 1-100
  promptDriveUpload: true,   // D-05: ask after each capture
  driveConnected: false,     // Google Drive connection status
  driveFolderId: null        // Dedicated default SnapFlow folder ID
};

export const CAPTURE_TYPES = {
  SCREENSHOT: 'screenshot',
  GIF: 'gif',
  VIDEO: 'video'
};

export const CAPTURE_SUBTYPES = {
  VIEWPORT: 'visible_viewport',
  FULLPAGE: 'full_page',
  REGION: 'selected_region',
  SCREEN: 'entire_screen',
  WINDOW: 'window',
  TAB: 'tab'
};
