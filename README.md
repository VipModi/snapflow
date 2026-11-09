# SnapFlow — Browser Capture & Recording Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Minimum Chrome: 116+](https://img.shields.io/badge/Chrome-116%2B-blue.svg)](https://developer.chrome.com/blog/new-in-chrome-116/)

SnapFlow is an open-source browser extension built on Chrome Manifest V3 for capturing screenshots, animated GIFs, and screen recordings with local saving and optional Google Drive integration.

> [!NOTE]
> SnapFlow is under active staged development. Features currently implemented versus planned for upcoming phases are detailed below.

---

## Development Status & Feature Roadmap

### Implemented & Verified (Phases 1 & 2)
- [x] **Visible Viewport Screenshot:** 1-click active tab snapshot via extension popup (`src/popup/`) or keyboard shortcut (`Ctrl+Shift+S`).
- [x] **Full-Page Screenshot:** Automated vertical scroll-and-stitch capture of entire scrollable webpages (`src/capture/full-page.js`).
- [x] **Format Options:** PNG (lossless default) and JPEG with configurable quality (50–100%).
- [x] **Direct Clipboard Copy:** 1-click copy of captured viewport image directly to system clipboard.
- [x] **Local Downloads Integration:** Saves capture files directly to your device via standard Chrome Downloads API.
- [x] **Metadata Library & Preferences Page:** Full-page management interface (`src/management/`) displaying capture history, file sizes, timestamps, and preferences.
- [x] **Privacy-Protected Metadata Indexing:** Capture metadata explicitly omits and strips page URLs and page titles to prevent history exposure.
- [x] **Zero Telemetry:** No analytics, external telemetry, or remote logging.

### Planned for Upcoming Phases
- [ ] **Selected-Region Screenshot:** Interactive draggable crop overlay (Milestone 3).
- [ ] **Client-Side Annotation Tools:** Crop, arrows, text, and blur tools (Milestone 4).
- [ ] **Screen & Tab Video Recording:** WebM video recording with independent tab and microphone audio toggles via Manifest V3 offscreen documents (Milestone 5).
- [ ] **Animated GIF Creation:** Client-side frame quantization with duration and file-size guardrails (Milestone 6).
- [ ] **Optional Google Drive Integration:** User-initiated per-capture upload to a dedicated default SnapFlow folder (Milestone 7).

---

## Security & Privacy Model

- **Principle of Least Privilege:** Requests only narrow, required permissions (`activeTab`, `downloads`, `storage`, `scripting`, `offscreen`). Broad host permissions such as `<all_urls>` are strictly excluded.
- **Privacy-Guaranteed Metadata:** Capture records indexed in `chrome.storage.local` store only filename, format, timestamp, file size, and storage status. Page URLs and page titles are never stored.
- **Local-First Storage:** Media captures are written directly to the local filesystem through Chrome's standard download manager. No data is transmitted externally unless explicitly authorized by the user for Google Drive upload in a future release.

---

## Architecture & Technology Stack

- **Extension Framework:** Chrome Extensions Manifest V3
- **Minimum Chrome Version:** Chrome 116+ (tested on Chrome 157)
- **Background Architecture:** Modular ES modules service worker (`src/background/service-worker.js`)
- **Stitching Engine:** HTML5 Canvas rendering for full-page scroll-and-stitch compositing
- **Storage:** Chrome Downloads API for media files; `chrome.storage.local` for lightweight capture metadata and user settings
- **Zero External Dependencies:** Built entirely with standard Web and Chrome Extension APIs; ₹0 initial infrastructure cost.

---

## Directory Structure

```text
SnapFlow/
├── manifest.json            # Manifest V3 extension configuration
├── package.json             # Project metadata and test scripts
├── README.md                # Project documentation
├── LICENSE                  # Open source license (pending final confirmation)
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
│   ├── capture/             # Capture logic
│   │   ├── screenshot.js
│   │   └── full-page.js
│   ├── storage/             # Metadata indexing and settings manager
│   │   ├── metadata-store.js
│   │   └── settings-store.js
│   ├── shared/              # Common utilities, constants, formatters
│   │   ├── constants.js
│   │   └── formatters.js
│   └── offscreen/           # Offscreen document (for continuous recording & canvas)
│       ├── offscreen.html
│       └── offscreen.js
└── tests/                   # Automated test suites
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
4. Enable the **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** and select the `SnapFlow` folder.
6. The SnapFlow camera icon will appear in your Chrome toolbar. Pin it for quick access.

---

## Automated Tests

Run the unit test suite using Node's built-in test runner (requires Node.js 18+):
```bash
npm test
```

Run the end-to-end integration test with a live Chrome browser:
```bash
npm run test:e2e
```

---

## License

This project currently includes an MIT License (`LICENSE`). Note that the license choice is pending final owner confirmation by Vipul.
