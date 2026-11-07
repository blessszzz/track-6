# Diabetes risk screening for primary care (Tech Wave 2026, Track 6)

An explainable diabetes / prediabetes risk model and a trilingual (English, Français, Kreol Morisien) screening tool for clinicians, with follow-up reminders.

> **PROTOTYPE.** Not a diagnosis, not a replacement for clinical judgement or medical advice. **No real patient data is used or stored.**

## What it does
1. A nurse or clinician answers 16 simple questions (no blood test).
2. The tool returns a LOW / MODERATE / HIGH band, the estimated risk, and **the factors that raised or lowered the score** (each with its effect on the odds).
3. It suggests a follow-up date (re-screen in 3 years / 12 months, or confirmatory blood test within 1 month) and exports a calendar reminder (.ics).
4. A **Model card** tab shows accuracy, a benchmark vs a black-box model, a fairness audit and known limits.

## Try it
- **Live demo:** [techwave-track-6.netlify.app]
- **No install:** open `web/standalone.html` in any browser. It is the same model, the same three languages, one file, works offline.
- **2-minute video:** `<PASTE YOUR VIDEO LINK HERE>`

## Quick start
```bash
pip install -r requirements.txt
# put the three BRFSS CSVs in data/  (see "Data")
python src/train.py --data-dir data          # trains, evaluates, audits fairness (~1 min)
streamlit run app/app.py                     # opens the screening tool (Streamlit version, exports .ics reminders)
python tools/build_web.py                    # rebuilds web/standalone.html from the trained model
python tools/make_submission.py --team "Your Team" --members "A, B, C"   # deck + ethics note
```

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
scikit-learn (LogisticRegression, metrics), LightGBM (benchmark only), pandas, NumPy, Matplotlib, Streamlit (UI), python-pptx (deck generator). The single-file web version uses plain JavaScript and Google Fonts for typography only. **No external APIs receive user inputs**; the only outbound link is an optional \"Add to Google Calendar\" button that opens a pre-filled calendar page when the user clicks it (it contains only the reminder text and date, never answers).

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
