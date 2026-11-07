# Patient PWA changes

- Edit source files in `tools/`, not only generated HTML in `web/`.
- `web_template.html` embeds `journey.js`, `voice.js`, `report.js`, and `pwa.js` through `build_web.py`. Changes to these sources do not affect the served app until rebuilt.
- After every patient app change, run `python tools/build_web.py`. Commit or deliver the regenerated `web/index.html`, `web/standalone.html`, `web/sw.js`, and `web/version.json` together with the sources.
- Keep `web/_headers`, the manifest, and icons in the deployment. The installed PWA and browser app share these same artifacts; there is no separate installed-app build.
- When adding runtime assets, include them in the service-worker shell and release fingerprint as appropriate, and verify they work offline.
- Verify changes with `python tools/test_pwa.py` using the documented development dependencies. For update changes, preserve the tests for an active screening, an idle second window, session-boundary reload, and offline use.
- Keep patient inputs, results, audio, and transcripts out of caches and persistent storage. Do not change model coefficients, classifications, or clinical calculations unless explicitly requested.
- `netlify.toml` rebuilds and publishes the public patient app from Git. Manual deploys must upload the complete rebuilt `web/` folder. Never imply local changes are live before a successful production deployment is verified.
- The separate `admin-web/` output must stay outside the patient deployment and service-worker cache. Its hosting sign-in is configured separately.
