# SnapFlow — Browser Capture & Recording Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Minimum Chrome: 116+](https://img.shields.io/badge/Chrome-116%2B-blue.svg)](https://developer.chrome.com/blog/new-in-chrome-116/)

SnapFlow is a browser extension built on Chrome Manifest V3 for capturing webpages and screen content as pixel-accurate screenshots, animated GIFs, and WebM video recordings.

---

## Key Features

- **Screenshot Capture:**
  - Visible Viewport Capture (1-click active tab snapshot)
  - Full-Page Capture with automated scroll and stitch
  - Selected-Region Capture with interactive cropping
  - Window & Entire Screen Capture
  - PNG (default) and JPEG formats with configurable quality
  - Direct 1-click clipboard copy
  - Basic client-side annotations: Crop, Arrows, Text, Blur
- **Screen Recording:**
  - Tab, Window, and Entire Screen capture
  - High-efficiency WebM video recording
  - Independent Microphone and Tab Audio mixing & toggles
  - Recording continuity across popup closures via MV3 Offscreen Documents
  - Duration alerts (30-minute soft warning, 2-hour hard stop with sleep tolerances)
- **Animated GIF Creation:**
  - Frame-rate, dimension, and duration performance guardrails
  - Client-side encoding via lightweight canvas/palette quantization
- **Privacy & Storage First:**
  - **100% Local Processing:** Files are saved directly to your local device via Chrome Downloads
  - **Zero Telemetry:** No analytics, no third-party trackers, no remote logging
  - **Privacy Protected Metadata:** Capture metadata never logs or stores page URLs or page titles
  - **Optional Google Drive Storage:** User-initiated per-capture upload to a dedicated SnapFlow folder (never uploaded automatically)

---

## Architecture & Technology Stack

- **Extension Framework:** Chrome Extensions Manifest V3
- **Minimum Chrome Version:** Chrome 116+
- **Background Architecture:** Modular ES modules service worker (`src/background/service-worker.js`)
- **Capture & Offscreen Engine:** Dedicated Offscreen document (`src/offscreen/offscreen.html`) for media processing and continuous recording
- **Storage:** Chrome Downloads API for media files; `chrome.storage.local` for lightweight capture metadata and user preferences
- **Zero-Dependency Core:** Implemented with modern vanilla Web APIs (Web Audio API, Canvas 2D, MediaRecorder, File System Access / OPFS)

---

## Directory Structure

```text
SnapFlow/
├── manifest.json            # Manifest V3 extension configuration
├── package.json             # Project metadata and test scripts
├── README.md                # Project documentation
├── icons/                   # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── background/          # Background Service Worker coordinator
│   │   └── service-worker.js
│   ├── popup/               # Quick action popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── management/          # Full-page settings & capture library
│   │   ├── management.html
│   │   ├── management.css
│   │   └── management.js
│   ├── capture/             # Capture logic (screenshots, streams)
│   │   ├── screenshot.js
│   │   └── annotator.js
│   ├── storage/             # Metadata indexing and settings manager
│   │   ├── metadata-store.js
│   │   └── settings-store.js
│   ├── shared/              # Common utilities, constants, message types
│   │   ├── constants.js
│   │   └── formatters.js
│   └── offscreen/           # Offscreen document for recording & canvas
│       ├── offscreen.html
│       └── offscreen.js
└── tests/                   # Automated unit and integration test suites
    ├── unit/
    └── integration/
```

---

## Installation & Local Development

1. Clone or download this repository:
   ```bash
   git clone https://github.com/VipModi/snapflow.git
   cd snapflow
   ```
2. Open Google Chrome (version 116 or higher).
3. Navigate to `chrome://extensions/`.
4. Enable **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** and select the `SnapFlow` folder.
6. The SnapFlow camera icon will appear in your Chrome toolbar. Pin it for quick access.

---

## Automated Tests

Run the built-in test suite (requires Node.js 18+):
```bash
npm test
```

---

## Security & Privacy Guardrails

- **Zero Remote Exfiltration:** Capture data stays on your local machine unless you explicitly authorize a Google Drive upload.
- **Principle of Least Privilege:** Requests only `activeTab`, `scripting`, `downloads`, `storage`, and `offscreen` permissions. Broad host permissions (such as `<all_urls>`) are strictly avoided.
- **No Sensitive Metadata:** URL query parameters, page addresses, and page titles are never indexed in extension storage.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
