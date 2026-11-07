# Diabetes risk screening for primary care (Tech Wave 2026, Track 6)

An explainable diabetes / prediabetes risk model and a trilingual (English, Français, Kreol Morisien) screening tool for clinicians, with follow-up reminders.

> **PROTOTYPE.** Not a diagnosis, not a replacement for clinical judgement or medical advice. **No real patient data is used or stored.**

## What it does
1. A nurse or clinician answers 16 simple questions (no blood test).
2. The tool returns a LOW / MODERATE / HIGH band, the estimated risk, and **the factors that raised or lowered the score** (each with its effect on the odds).
3. It suggests a follow-up date (re-screen in 3 years / 12 months, or confirmatory blood test within 1 month) and exports a calendar reminder (.ics).
4. A **Model card** tab shows accuracy, a benchmark vs a black-box model, a fairness audit and known limits.

## Try it
- **Live demo:** [techwave-track-6.netlify.app](https://techwave-track-6.netlify.app/)
- **No install:** open `web/standalone.html` in any browser. It is the same model, the same three languages, one file, works offline.
- **2-minute video:** [YouTube Link](https://youtu.be/8aNG-ubgTMw)

## Quick start
```bash
pip install -r requirements.txt
# put the three BRFSS CSVs in data/  (see "Data")
python src/train.py --data-dir data          # trains, evaluates, audits fairness (~1 min)
streamlit run app/app.py                     # opens the screening tool (Streamlit version, exports .ics reminders)
python tools/build_web.py                    # rebuilds web/standalone.html from the trained model
python tools/make_submission.py --team "Your Team" --members "A, B, C"   # deck + ethics note
```

## PWA Installation and Offline Use

On the HTTPS live demo, use **Install app** / **Add to Home screen** in Android Chrome. On iPhone or iPad, open in Safari and choose **Share → Add to Home Screen** (enable Open as Web App if offered). On desktop Chrome or Edge, use the address-bar install icon or browser menu; on supported macOS Safari versions, use **File → Add to Dock**. Options vary by browser and OS.

Load the app online and leave it open while the service worker caches both pages and their assets. After caching completes, the installed app can launch offline: questions, scores, explanations, all three languages and reminder copying remain available. Google Calendar needs internet; clipboard support depends on the browser. The existing `.ics` export belongs to the Streamlit app; the web app has no `.ics` download control. Fonts are cached when reachable; otherwise the existing system-font fallbacks apply. Only public static files are cached, never completed questionnaires or results. Each new session starts in English; the patient chooses the language before choosing a mode.

To test locally, run `python -m http.server 8000 --directory web`, open `http://localhost:8000/`, and check DevTools **Application → Manifest / Service Workers / Cache Storage**. Wait for the worker to activate, then switch the browser offline and reload. Service workers require HTTPS or localhost. Directly opening `web/standalone.html` still works without installation.

Run `python tools/build_web.py` after app changes; it rebuilds both HTML pages and generates a content-versioned `web/sw.js`. Publish the entire `web/` directory to Netlify, including the manifest, worker, and `icons/` directory. No new server or API configuration is needed. Online launches fetch the latest deployed HTML, while offline launches use the cached app. Updates are checked on opening, resuming, reconnecting, and once per minute while visible. An idle app refreshes automatically; an active screening, report, or closing screen is preserved until Start again. The footer shows the build version and offers Check for updates. Keep the worker served as JavaScript without redirects or immutable caching.

Developer verification: `python tools/test_pwa.py` requires Playwright, its Chromium browser, and Pillow in the test environment (not app dependencies). It compares the web app against the Git HEAD version and checks installation prerequisites, offline behavior, and cache updates. The checked-in icons can optionally be regenerated with `python tools/generate_pwa_icons.py` (Pillow), then rebuild the web app.

## Publishing updates to the installed PWA

The browser app and installed PWA use the same `web/` output. Run `python tools/build_web.py` after changing the template, question-flow, voice, report, model, translations, icons, or update code. This generates a shared release ID in the HTML, `sw.js`, and `version.json`. `web/_headers` makes Netlify revalidate HTML/manifest and avoid caching the worker/version check at the HTTP layer. All app behavior is embedded in each generated HTML page, so an open screening retains its existing code and answers until a safe reload.

**Git-connected Netlify:** the root `netlify.toml` runs the web builder and publishes `web/` automatically on configured production-branch deploys. Netlify installs the existing root Python requirements. Commit and push the source changes, then confirm the production deploy succeeds. This configuration is for the public patient project; continue deploying `admin-web/` separately with its own access protection.

**Manual Netlify uploads:** rebuild locally and upload the entire `web/` folder, including `_headers`, `version.json`, `sw.js`, manifest and icons. A local edit or build cannot change an already-deployed Netlify site. After publishing, check the live `/version.json` against the local file or footer version. Users must come online to receive a release; no uninstall/reinstall should be necessary.

For the initial upgrade from the older PWA, deploy these files and reopen the app online. If the previous worker still holds the old page, close all installed-app windows and browser tabs for that site once, then reopen. The new update mechanism applies only after this release reaches the device. Check for updates reports connection failures without removing the offline copy.

## Voice and text screening

A 2.2-second animated stethoscope splash leads to icon-first English, French and Kreol language cards, then Voice/Text mode cards. English is the default for each fresh session. Kreol voice is disabled with an explanatory note; Kreol text screening remains fully available. Voice mode requests microphone permission when selected, reads each question and its choices, and starts listening after read-aloud when supported. The compact transcript stays beside the question (below it on phones); review or correct it and tap the arrow to accept and continue. The top toolbar provides language flags and Voice/Text icons. Ambiguous or out-of-range answers are rejected rather than guessed. Weight (kg) and height (cm) are separate steps, in that order, with one spoken number per field. Text controls remain available throughout.

Read-aloud uses installed local voices only. Voice screening is offered only for English and French. The closing screen displays thanks in all three languages; spoken playback depends on installed local voices. On-device recognition is required by default; missing language packs or unsupported devices fall back to text. When on-device recognition is unavailable, a one-time dialog asks whether to allow browser speech processing, which may transmit audio to the browser provider and may need internet. This notice is not repeated beneath every question. The permission-check microphone stream is immediately stopped; recording is not retained. This session-only choice resets for a new patient. No recordings or transcripts are stored by this app; browser-provider processing follows that provider's policies. No new speech service, API key or dependency is added.

Microphone access needs HTTPS or localhost, browser permission, and speech-recognition support. Text screening continues to work offline; voice availability depends on installed voices, language packs and browser support. Real microphone accuracy, audio playback, Creole pronunciation, and provider behavior require manual testing on the target device. Automated tests simulate speech events to check review/confirmation, parsing, consent and text fallback.

## Report download and ending a session

The completed report includes a local **Download PDF report** button, alongside Google Calendar and reminder copying. PDF generation uses only browser canvas and Blob APIs, works offline, and retains accents by embedding rendered report pages (the PDF text is image-based, not selectable). Reports use a teal branded header, colour-coded risk summary, amber prototype notice, follow-up card, factor tables, contribution chart, answer summary and numbered pages. They include the original warning, risk classification, estimated risk, explanations, follow-up recommendation and answers. The app does not store generated reports; the downloaded file remains wherever the user saves it.

Finish or Exit clears answers, numeric drafts, transcript and speech consent, then shows thanks in English, French and Kreol. Start again returns to language choice with English as default. Browsers generally block scripts from closing ordinary tabs, so Exit shows a close-tab instruction when automatic closing is unavailable. For a one-time migration from the older cache-first worker, close and reopen the installed app after deploying this update; subsequent releases use the automatic update flow.

## Screening flow and administrator deployment

The patient app shows one question at a time with progress and a Back control. Choice answers advance after a short pause. Number inputs advance after 1.8 seconds without typing once valid, or immediately with Enter. Sliders advance when a value is chosen; the explicit 0 button confirms zero days. Voice answers advance only after transcript confirmation. The report and reminder actions appear only after all questions. Weight and height are separate questions, bringing the flow to 17 input steps while the unchanged model still uses 16 predictors (BMI is calculated from weight and height). Answers stay in memory and are cleared with New patient. The About this screening section is omitted from the patient view; the report retains the original prototype warning. Transitions respect reduced-motion preferences.

`python tools/build_web.py` also generates **`admin-web/`**, a separate model-card site. Publish only **`web/`** to the public patient project. Never upload the repository root or put `admin-web/` inside `web/`. The public app does not include the performance/fairness datasets, model-card tab, or administrator site in its offline cache. The scoring model necessarily remains available in the offline patient app.

For real administrator sign-in, create a separate Netlify project with **Private** visibility **before uploading `admin-web/`**. In **Project configuration → General → Visitor access → Project visibility**, choose **Private** and apply it to **Production and previews**. Invite authorized team members through Netlify; they use their own Netlify credentials. Older Netlify plans may label this **Password Protection → Team login → All deploys**. Availability and team membership limits depend on your Netlify plan. See [Netlify access protection](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/).

Only after protection is enabled, deploy the complete `admin-web/` directory to that separate project. Check its production URL and deploy-specific URLs in a signed-out/private browser: they must require sign-in and must not serve the model card anonymously. The admin output has no service worker and uses `Cache-Control: no-store`. No credentials are embedded in source files. Hosting-level protection must be configured in Netlify; generating the folder does not enable it. Previously public deployments and their cached copies cannot be made confidential by this change.

## Data
Public CDC **BRFSS 2015** survey indicators (Kaggle: "Diabetes Health Indicators Dataset"). Place these in `data/`:

| File | Rows | Use |
|---|---|---|
| `diabetes_binary_health_indicators_BRFSS2015.csv` | 253,680 | **Main**: train, validate, test (natural prevalence, so risks are calibrated) |
| `diabetes_binary_5050split_health_indicators_BRFSS2015.csv` | 70,692 | Comparison only: shows why a balanced-data model overstates risk |
| `diabetes_012_health_indicators_BRFSS2015.csv` | 253,680 | Not used (3-class; possible future work: prediabetes vs diabetes) |

`tools/make_dummy_data.py` creates a **synthetic** stand-in purely to test the pipeline; never report its numbers.

## Method
- **Model:** standardised logistic regression, no class weights (probabilities stay calibrated). Chosen because every number it produces can be explained and audited. The deployed model is `models/model.json`, a plain readable file.
- **Predictors (16):** HighBP, HighChol, BMI, Smoker, Stroke, HeartDiseaseorAttack, PhysActivity, Fruits, Veggies, HvyAlcoholConsump, GenHlth, MentHlth, PhysHlth, DiffWalk, Sex, Age.
- **Deliberately excluded:** Income and Education (socio-economic proxies on US scales), AnyHealthcare, NoDocbcCost (US insurance concepts), CholCheck (access to care). Income and Education are kept **only** to audit fairness.
- **Split:** 60% train / 20% validation / 20% test (stratified). Thresholds are picked on validation only: *screen-positive* = highest threshold with at least 80% sensitivity; *HIGH* = lowest higher threshold with PPV of at least 35%.
- **Benchmark:** LightGBM on 16 and on all 21 variables, to show what transparency costs.
- **Fairness audit:** sensitivity, false-positive rate, flagged share and AUC by sex, age band, income band, education band (`reports/fairness.csv`).
- **Explanation:** for each factor, contribution = coefficient × (value − average) / SD, shown as an odds multiplier versus an average respondent. This is exact for a logistic model.

## Every model, API and library used
scikit-learn (LogisticRegression, metrics), LightGBM (benchmark only), pandas, NumPy, Matplotlib, Streamlit (UI), python-pptx (deck generator). The single-file web version uses plain JavaScript and Google Fonts for typography only. **Scoring runs locally. Optional browser speech recognition can send audio to the browser provider only after the user allows browser speech processing**; the only outbound link is an optional \"Add to Google Calendar\" button that opens a pre-filled calendar page when the user clicks it (it contains only the reminder text and date, never answers).

## Languages
English, French and Mauritian Creole (`app/i18n.py`). **Creole and French text were drafted by an AI assistant: have native speakers and a clinician review them before any real use.**

## Limits and next steps
- US survey data, self-reported answers; not validated or calibrated for Mauritius.
- No ethnicity variable, so fairness across Mauritian communities cannot be measured here.
- Weaker for adults under 40 (low base risk; see the fairness table) and lower-income groups are flagged more often (more false positives).
- Some associations are survey artefacts (e.g. heavy drinking looks protective in BRFSS, probably because of who reports it); we show them as the model sees them and do not infer causes.
- Estimates risk only; cannot distinguish type 1 from type 2.
- Next: validate and recalibrate on de-identified Mauritian data under ethics approval (National Open Data Portal, Statistics Mauritius NCD surveys as a starting point).

## Repository layout
```
app/        Streamlit app + translations
web/        index.html + standalone.html: single-file version of the tool (built by tools/build_web.py)
src/        train.py (model, benchmarks, fairness audit, figures)
models/     model.json (deployed model)
reports/    metrics.json, fairness.csv, figures/
tools/      make_submission.py (deck + ethics note), build_web.py (+ web_template.html), make_dummy_data.py (test data)
submission/ pitch_deck.pptx, impact_and_ethics_note (md, docx, pdf), demo video
```

## Team
`<TEAM NAME>`: `<MEMBER NAMES>`. Built for Tech Wave 2026, AI Hackathon Mauritius, Track 6.

## License
MIT (see LICENSE). Data: CDC BRFSS 2015, public domain survey data (Kaggle mirror: Diabetes Health Indicators Dataset).
