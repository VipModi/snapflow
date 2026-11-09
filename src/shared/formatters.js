/**
 * SnapFlow Shared Formatters & Utilities
 */

/**
 * Generate standard timestamped filename: SnapFlow_YYYYMMDD_HHMMSS.ext
 * Ensures compliant local file naming without sensitive page data.
 * @param {Date} [date=new Date()]
 * @param {'png'|'jpeg'|'webm'|'gif'} [extension='png']
 * @returns {string}
 */
export function generateFilename(date = new Date(), extension = 'png') {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ext = extension.toLowerCase() === 'jpeg' ? 'jpg' : extension.toLowerCase();
  return `SnapFlow_${yyyy}${mm}${dd}_${hh}${min}${ss}.${ext}`;
}

/**
 * Format bytes into human-readable representation
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format seconds into HH:MM:SS or MM:SS
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}
