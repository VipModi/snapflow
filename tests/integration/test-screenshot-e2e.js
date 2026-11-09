/**
 * SnapFlow End-to-End Screenshot Integration Test
 * Launches Chrome, loads extension, triggers visible viewport screenshot via popup,
 * verifies download, and validates PNG binary format on disk.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXT_PATH = 'D:\\Portfolio\\SnapFlow';
const USER_DIR = 'D:\\Portfolio\\SnapFlow\\test-user-data-dir';
const DOWNLOADS_DIR = 'D:\\Portfolio\\SnapFlow\\test-downloads';
const DEBUG_PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePngHeader(buffer) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== sig[i]) throw new Error('Not a valid PNG signature');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  return { width, height, bitDepth, colorType };
}

async function runE2E() {
  console.log('--- Step 1: Prepare directories ---');
  if (fs.existsSync(DOWNLOADS_DIR)) fs.rmSync(DOWNLOADS_DIR, { recursive: true, force: true });
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  console.log('--- Step 2: Spawning Chrome with remote debugging ---');
  const chromeProc = spawn(CHROME_PATH, [
    `--user-data-dir=${USER_DIR}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'https://example.com/'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 25; i++) {
      await sleep(400);
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) { version = await res.json(); break; }
      } catch {}
    }

    if (!version) throw new Error('Chrome did not open port 9222');
    console.log('✓ Connected to Chrome:', version.Browser);

    const browserWs = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise(r => browserWs.onopen = r);

    let msgId = 1;
    function send(ws, method, params = {}) {
      return new Promise(resolve => {
        const id = msgId++;
        const handler = e => {
          const d = JSON.parse(e.data);
          if (d.id === id) { ws.removeEventListener('message', handler); resolve(d); }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Set download directory
    await send(browserWs, 'Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOADS_DIR,
      eventsEnabled: true
    });
    console.log('✓ Configured download directory:', DOWNLOADS_DIR);

    // Load unpacked extension via CDP
    console.log('--- Step 3: Loading unpacked extension via CDP Extensions.loadUnpacked ---');
    const loadResult = await send(browserWs, 'Extensions.loadUnpacked', { path: EXT_PATH });
    if (loadResult.error) {
      throw new Error(`Extensions.loadUnpacked failed: ${JSON.stringify(loadResult.error)}`);
    }
    const extensionId = loadResult.result.id;
    console.log('✓ SnapFlow loaded with ID:', extensionId);

    // Open popup.html as a page target
    console.log('--- Step 4: Opening SnapFlow Popup target ---');
    const popupTargetRes = await send(browserWs, 'Target.createTarget', {
      url: `chrome-extension://${extensionId}/src/popup/popup.html`
    });
    const popupTargetId = popupTargetRes.result.targetId;
    console.log('✓ Popup target created:', popupTargetId);

    await sleep(1000);

    const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    const popupTarget = targets.find(t => t.url && t.url.includes('popup.html'));
    if (!popupTarget) throw new Error('Popup target not found in target list');
    console.log('✓ Connecting to Popup WebSocket:', popupTarget.webSocketDebuggerUrl);

    const popupWs = new WebSocket(popupTarget.webSocketDebuggerUrl);
    await new Promise(r => popupWs.onopen = r);

    // Wait for popup DOM to be ready and click button
    console.log('--- Step 5: Triggering Viewport Capture inside Popup ---');
    const clickEval = await send(popupWs, 'Runtime.evaluate', {
      expression: `
        (async () => {
          const btn = document.getElementById('btnCaptureViewport');
          if (!btn) return { error: 'btnCaptureViewport not found' };
          
          btn.click();
          
          // Poll for status banner to reflect capture result
          for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 200));
            const banner = document.getElementById('statusBanner');
            const msg = document.getElementById('statusMessage').textContent;
            if (banner.classList.contains('success')) {
              return { success: true, message: msg };
            }
            if (banner.classList.contains('error')) {
              return { success: false, error: msg };
            }
          }
          return { error: 'Timeout waiting for capture status' };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Popup Execution Result:', JSON.stringify(clickEval.result.result.value, null, 2));
    const resultVal = clickEval.result.result.value;

    if (!resultVal || !resultVal.success) {
      throw new Error(`Popup capture failed: ${resultVal?.error || 'Unknown error'}`);
    }

    console.log('✓ Capture reported success in UI:', resultVal.message);

    // Verify downloaded file on disk
    console.log('--- Step 6: Verifying downloaded PNG file on disk ---');
    let downloadedFile = null;
    let foundDir = null;

    for (let i = 0; i < 25; i++) {
      // Check test-downloads directory
      if (fs.existsSync(DOWNLOADS_DIR)) {
        const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => (f.startsWith('SnapFlow_') || f === 'download.png') && f.endsWith('.png'));
        if (files.length > 0) {
          downloadedFile = path.join(DOWNLOADS_DIR, files[0]);
          foundDir = DOWNLOADS_DIR;
          break;
        }
      }
      // Check default Downloads directory
      const userDownloads = 'C:\\Users\\vmodi\\Downloads';
      if (fs.existsSync(userDownloads)) {
        const files = fs.readdirSync(userDownloads).filter(f => f.startsWith('SnapFlow_') && f.endsWith('.png'));
        if (files.length > 0) {
          const latest = files
            .map(f => ({ name: f, time: fs.statSync(path.join(userDownloads, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time)[0];
          if (Date.now() - latest.time < 60000) {
            downloadedFile = path.join(userDownloads, latest.name);
            foundDir = userDownloads;
            break;
          }
        }
      }
      await sleep(500);
    }

    if (!downloadedFile) {
      throw new Error(`Downloaded PNG file not found in ${DOWNLOADS_DIR} or C:\\Users\\vmodi\\Downloads`);
    }

    console.log(`✓ Confirmed downloaded file: ${downloadedFile}`);
    const stats = fs.statSync(downloadedFile);
    console.log(`  File size: ${stats.size} bytes`);

    const buf = fs.readFileSync(downloadedFile);
    const header = parsePngHeader(buf);
    console.log(`✓ PNG header verified: ${header.width}x${header.height}px, ${header.bitDepth}-bit color`);

    if (header.width <= 0 || header.height <= 0 || stats.size < 500) {
      throw new Error(`Corrupt PNG dimensions or size: ${header.width}x${header.height}, ${stats.size}B`);
    }

    console.log('🎉 REAL BROWSER E2E VERIFICATION PASSED!');

    popupWs.close();
    browserWs.close();
  } finally {
    console.log('Cleaning up Chrome process...');
    chromeProc.kill('SIGKILL');
  }
}

runE2E().catch(err => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
