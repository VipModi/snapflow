import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock chrome.storage.local before importing metadata-store
const storageMock = {};
global.chrome = {
  storage: {
    local: {
      get: async (key) => {
        return { [key]: storageMock[key] || [] };
      },
      set: async (obj) => {
        Object.assign(storageMock, obj);
      }
    }
  }
};

const { saveCaptureMetadata, getAllCaptures, deleteCapture, updateCapture } = await import('../../src/storage/metadata-store.js');

describe('Metadata Store & Privacy Enforcement (D-17 & SF-FR-022)', () => {
  beforeEach(() => {
    for (const k in storageMock) delete storageMock[k];
  });

  it('strictly strips page URL and page title from metadata records', async () => {
    const maliciousItem = {
      type: 'screenshot',
      subtype: 'visible_viewport',
      format: 'png',
      filename: 'SnapFlow_20261109_120000.png',
      fileSizeBytes: 54321,
      // Attempt to inject sensitive page data
      url: 'https://mail.google.com/mail/u/0/#inbox',
      title: 'Confidential Internal Financials - Gmail'
    };

    const saved = await saveCaptureMetadata(maliciousItem);

    // Verify sanitized object
    assert.equal(saved.filename, 'SnapFlow_20261109_120000.png');
    assert.equal(saved.type, 'screenshot');
    assert.equal(saved.url, undefined, 'URL must not be saved');
    assert.equal(saved.title, undefined, 'Title must not be saved');

    // Verify stored data in storage
    const all = await getAllCaptures();
    assert.equal(all.length, 1);
    assert.equal(all[0].url, undefined);
    assert.equal(all[0].title, undefined);
  });

  it('deletes capture metadata record correctly', async () => {
    const item1 = await saveCaptureMetadata({ type: 'screenshot', filename: 'test1.png' });
    const item2 = await saveCaptureMetadata({ type: 'screenshot', filename: 'test2.png' });

    assert.equal((await getAllCaptures()).length, 2);

    const deleted = await deleteCapture(item1.id);
    assert.equal(deleted, true);

    const remaining = await getAllCaptures();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, item2.id);
  });
});
