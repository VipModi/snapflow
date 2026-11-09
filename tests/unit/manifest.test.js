import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '../../manifest.json');

describe('Manifest V3 Compliance & Permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('declares Manifest V3 and valid name/version', () => {
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, 'SnapFlow — Screen Capture & Recorder');
    assert.equal(manifest.version, '0.1.0');
  });

  it('enforces minimum Chrome version 116+ (D-01 & T-08)', () => {
    assert.equal(manifest.minimum_chrome_version, '116');
  });

  it('uses ES module background service worker', () => {
    assert.equal(manifest.background.service_worker, 'src/background/service-worker.js');
    assert.equal(manifest.background.type, 'module');
  });

  it('requests only necessary permissions without <all_urls> (T-03)', () => {
    assert.ok(manifest.permissions.includes('activeTab'), 'Must include activeTab');
    assert.ok(manifest.permissions.includes('downloads'), 'Must include downloads');
    assert.ok(manifest.permissions.includes('storage'), 'Must include storage');
    assert.ok(manifest.permissions.includes('scripting'), 'Must include scripting');
    assert.ok(!manifest.permissions.includes('<all_urls>'), 'Must NOT request <all_urls>');
    assert.ok(!manifest.permissions.includes('*://*/*'), 'Must NOT request wildcard host permissions');
    assert.ok(!manifest.host_permissions || manifest.host_permissions.length === 0, 'Must NOT have host_permissions');
  });

  it('does NOT request invalid "microphone" manifest permission (T-09)', () => {
    assert.ok(!manifest.permissions.includes('microphone'), 'Must NOT declare microphone in permissions');
    if (manifest.optional_permissions) {
      assert.ok(!manifest.optional_permissions.includes('microphone'), 'Must NOT declare microphone in optional_permissions');
    }
  });

  it('all declared icon files physically exist on disk', () => {
    for (const size of ['16', '32', '48', '128']) {
      const relPath = manifest.icons[size];
      const absPath = path.resolve(__dirname, '../../', relPath);
      assert.ok(fs.existsSync(absPath), `Icon file ${relPath} must exist on disk`);
    }
  });
});
