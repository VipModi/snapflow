import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateFilename, formatBytes, formatDuration } from '../../src/shared/formatters.js';

describe('Shared Formatters', () => {
  it('generateFilename creates valid timestamped PNG filename', () => {
    const fixedDate = new Date(2026, 10, 9, 17, 30, 45); // Nov 9, 2026 17:30:45
    const filename = generateFilename(fixedDate, 'png');
    assert.equal(filename, 'SnapFlow_20261109_173045.png');
  });

  it('generateFilename creates valid timestamped JPEG filename', () => {
    const fixedDate = new Date(2026, 0, 15, 9, 5, 2); // Jan 15, 2026 09:05:02
    const filename = generateFilename(fixedDate, 'jpeg');
    assert.equal(filename, 'SnapFlow_20260115_090502.jpg');
  });

  it('formatBytes formats byte amounts accurately', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(1048576), '1 MB');
    assert.equal(formatBytes(1073741824), '1 GB');
  });

  it('formatDuration formats seconds accurately', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(45), '00:45');
    assert.equal(formatDuration(65), '01:05');
    assert.equal(formatDuration(3600), '01:00:00');
    assert.equal(formatDuration(7322), '02:02:02');
  });
});
