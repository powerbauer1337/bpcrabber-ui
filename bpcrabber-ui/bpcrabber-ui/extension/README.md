# BeatportDL Browser Extension

This Chrome extension lets you send Beatport track/release URLs to your BeatportDL backend for downloading.

## Setup

1. Build/clone the BeatportDL backend and ensure it is running at `http://localhost:8080`.
2. In Chrome, go to `chrome://extensions` and enable Developer Mode.
3. Click "Load unpacked" and select the `extension/` directory.
4. Click the extension icon to open the popup, paste a Beatport URL, and send it to the backend.

## Development Notes
- The extension uses Manifest V3.
- The backend URL is currently hardcoded to `http://localhost:8080` in `popup.js`.
- Content and background scripts are placeholders for future UI injection and advanced features.

## Next Steps
- Inject UI into beatport.com for one-click sending.
- Show download status in the popup.
- Make backend URL configurable. 