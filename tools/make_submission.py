#!/usr/bin/env python3
"""Build the pitch deck (8 slides) and the one-page ethics note from reports/metrics.json.

    python tools/make_submission.py --team "Your Team Name" --members "A, B, C"

Run AFTER src/train.py on the REAL BRFSS files, so every number in the deck is real.
Outputs: submission/pitch_deck.pptx, submission/impact_and_ethics_note.md
"""
import argparse
import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
FIG = ROOT / "reports" / "figures"
TEAL, DARK, ORANGE, GREY, LIGHT = (RGBColor(0x1F, 0x6F, 0x78), RGBColor(0x12, 0x34, 0x3B),
                                   RGBColor(0xE8, 0x89, 0x0C), RGBColor(0x5B, 0x65, 0x70), RGBColor(0xE8, 0xF3, 0xF4))
IDF = "https://diabetesatlas.org/data-by-location/country/mauritius/"


def tb(slide, x, y, w, h, text, size=18, bold=False, color=DARK, align=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    lines = text if isinstance(text, list) else [text]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size, p.font.bold, p.font.color.rgb, p.font.name = Pt(size), bold, color, "Calibri"
        p.space_after = Pt(8)
        if align:
            p.alignment = align
    return box


def new_slide(prs, title, kicker=None):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bar = s.shapes.add_shape(1, 0, 0, Inches(0.25), prs.slide_height)
    bar.fill.solid(); bar.fill.fore_color.rgb = TEAL; bar.line.fill.background()
    if kicker:
        tb(s, 0.6, 0.35, 10, 0.4, kicker.upper(), 12, True, ORANGE)
    tb(s, 0.6, 0.65, 12, 1.0, title, 32, True, DARK)
    tb(s, 0.6, 7.0, 12, 0.35, "Tech Wave 2026 · Track 6 · Prototype: not a diagnosis, not a replacement for clinical judgement", 10, False, GREY)
    return s


def stat(slide, x, y, big, small, w=2.9):
    card = slide.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(1.7))
    card.fill.solid(); card.fill.fore_color.rgb = LIGHT; card.line.fill.background()
    tb(slide, x + 0.15, y + 0.1, w - 0.3, 0.9, big, 36, True, TEAL)
    tb(slide, x + 0.15, y + 0.95, w - 0.3, 0.7, small, 13, False, DARK)


def bullets(slide, x, y, w, items, size=18):
    tb(slide, x, y, w, 4.5, ["•  " + i for i in items], size)


def pic(slide, name, x, y, w):
    p = FIG / name
    if p.exists():
        slide.shapes.add_picture(str(p), Inches(x), Inches(y), width=Inches(w))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", default="Team name")
    ap.add_argument("--members", default="Member 1, Member 2, Member 3")
    a = ap.parse_args()
    m = json.loads((ROOT / "reports" / "metrics.json").read_text())
    d, hb, bench, gaps = m["deployed_test"], m["high_band_test"], m["benchmarks"], m["fairness_gaps"]
    lgb = bench.get("LightGBM (all 21 features)", {}).get("roc_auc")
    import pandas as pd
    fr = pd.read_csv(ROOT / "reports" / "fairness.csv")
    def cell(attr, grp, col):
        r = fr[(fr.attribute == attr) & (fr.group == grp)]
        return float(r[col].iloc[0]) if len(r) else None
    young = cell("Age band", "18-39", "sensitivity")
    old_fpr = cell("Age band", "70+", "false_positive_rate")
    pct = lambda v: f"{v * 100:.0f}%"
    out = ROOT / "submission"
    out.mkdir(exist_ok=True)

    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

    # 1 title
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid(); bg.fill.fore_color.rgb = DARK; bg.line.fill.background()
    tb(s, 0.9, 1.6, 11.5, 0.5, "TECH WAVE 2026 · AI HACKATHON MAURITIUS · TRACK 6", 14, True, ORANGE)
    tb(s, 0.9, 2.2, 11.5, 2.2, "Finding diabetes earlier, in the clinic, in three languages", 46, True, RGBColor(255, 255, 255))
    tb(s, 0.9, 4.6, 11.5, 0.6, "An explainable risk-screening tool for primary care in Mauritius", 22, False, RGBColor(0xBF, 0xE3, 0xE6))
    tb(s, 0.9, 5.8, 11.5, 0.9, [a.team, a.members], 16, False, RGBColor(0xBF, 0xE3, 0xE6))

    # 2 problem
    s = new_slide(prs, "Too many people find out too late", "The problem")
    stat(s, 0.6, 1.9, "20.1%", "of adults (20-79) in Mauritius live with diabetes (IDF 2024)")
    stat(s, 3.8, 1.9, "28.2%", "of them are undiagnosed, about 61,000 people (IDF 2024)")
    stat(s, 7.0, 1.9, "2 min", "is all a nurse can spare for screening in a busy clinic")
    bullets(s, 0.6, 4.1, 12, ["Late diagnosis means complications (kidney, eye, heart, foot) that are costly and avoidable.",
                              "A screening aid only helps if clinicians trust it: it must show WHY a person is flagged.",
                              f"Source: IDF Diabetes Atlas, Mauritius page, {IDF}"], 17)

    # 3 solution
    s = new_slide(prs, "16 questions, one risk band, clear reasons, a follow-up date", "Our solution")
    for i, (h, t) in enumerate([("1  Ask", "16 simple questions a nurse can answer with the patient: no blood test."),
                                ("2  Explain", "LOW / MODERATE / HIGH band plus the factors that raised or lowered the score."),
                                ("3  Follow up", "Suggested re-screen or blood-test date, exported as a calendar reminder.")]):
        y = 1.75 + i * 1.5
        card = s.shapes.add_shape(1, Inches(0.6), Inches(y), Inches(4.6), Inches(1.35))
        card.fill.solid(); card.fill.fore_color.rgb = LIGHT; card.line.fill.background()
        tb(s, 0.8, y + 0.05, 4.2, 0.5, h, 22, True, TEAL)
        tb(s, 0.8, y + 0.55, 4.2, 0.8, t, 13)
    pic(s, "app_result.png", 5.5, 1.75, 7.4)
    tb(s, 5.5, 5.15, 7.4, 0.4, "Live screenshot of the prototype (example patient, English interface)", 11, False, GREY)
    bullets(s, 0.6, 6.15, 12, ["English, Français and Kreol Morisien in one tap. Runs on the device: nothing is stored or sent."], 15)

    # 4 model
    s = new_slide(prs, "A transparent model that holds its own against a black box", "The model")
    stat(s, 0.6, 1.8, f"{d['roc_auc']:.2f}", "ROC-AUC, held-out test set", 2.0)
    stat(s, 2.8, 1.8, pct(d["sensitivity"]), "of true cases flagged at the screening threshold", 2.0)
    stat(s, 5.0, 1.8, pct(d["npv"]), "of people NOT flagged are truly clear (NPV)", 2.0)
    bullets(s, 0.6, 3.8, 6.3, [f"Logistic regression on {len(m['features_used'])} questions; trained on the real {m['prevalence']:.0%} prevalence so risks are calibrated.",
                               (f"Benchmark: LightGBM on all 21 variables reaches ROC-AUC {lgb:.2f} vs our {d['roc_auc']:.2f}; "
                                + ("a negligible price for full transparency." if lgb - d['roc_auc'] <= 0.02
                                   else "the gap is the price we pay for full transparency.") if lgb else "Benchmark: gradient boosting compared in the model card."),
                               f"Data: CDC BRFSS 2015, {m['n_rows']:,} survey responses (public). Thresholds tuned on a separate validation set."], 15)
    pic(s, "roc_pr.png", 7.3, 2.0, 5.6)

    # 5 explainability
    s = new_slide(prs, "Every score comes with its reasons", "Trust")
    bullets(s, 0.6, 1.8, 6.2, ["Each factor shows its effect on the person's odds versus an average respondent (for example, ×1.4).",
                               "Clinicians can check the logic against what they know: blood pressure, BMI, age and general health lead, as expected.",
                               "The whole model is a short JSON file anyone can read: no hidden layers, no black box.",
                               "A model card inside the app shows accuracy, limits and the fairness audit."], 17)
    pic(s, "odds_ratios.png", 7.2, 1.6, 5.4)

    # 6 fairness + privacy
    s = new_slide(prs, "Fairness and privacy by design", "The hard part")
    ag = gaps.get("Age band", {}).get("sensitivity_gap")
    sx = gaps.get("Sex", {}).get("sensitivity_gap")
    bullets(s, 0.6, 1.8, 6.4, [
        "Income, education and US insurance variables are NOT predictors, so the tool cannot score people on social status.",
        "We still audit by sex, age, income and education on the test set.",
        (f"Sexes are treated alike (sensitivity gap {sx * 100:.0f} points). Age is the big gap: only {young * 100:.0f}% of true cases aged 18-39 are flagged vs {cell('Age band', '70+', 'sensitivity') * 100:.0f}% at 70+, because young people have low base risk. We say so and advise clinical judgement for younger adults." if young is not None and sx is not None else "See the fairness table in the model card."),
        "Honest limit: the data has no ethnicity field, so Mauritian community fairness must be tested on local data before any deployment.",
        "Privacy: no accounts, no storage, no network calls with patient data; all calculation is local."], 15)
    pic(s, "fairness_sensitivity.png", 7.2, 1.7, 5.7)

    # 7 impact / deployment
    s = new_slide(prs, "From prototype to clinic: a safe path", "Impact and deployment")
    bullets(s, 0.6, 1.8, 12, [
        "Who benefits: patients found earlier, nurses and GPs who get a fast second opinion, and public health planners who can target follow-up.",
        "Step 1 (now): open-source prototype, public data, demo for clinicians.",
        "Step 2: validate and recalibrate on Mauritian data with ethics approval and the Ministry of Health, including community-level fairness checks.",
        "Step 3: pilot in a few primary-care centres, measuring cases found and follow-ups completed.",
        "Risks we manage: over-reliance (clear prototype banner), false reassurance (a LOW band still suggests re-screening), over-referral (tunable threshold), language errors (native-speaker review)."], 17)

    # 8 close
    s = new_slide(prs, "What we built, and what we ask", "Summary")
    bullets(s, 0.6, 1.8, 12, [
        "A calibrated, explainable diabetes risk model plus a trilingual screening tool with follow-up reminders.",
        "Built on public data only; no real patient data was used.",
        "Fully reproducible: public repository, one command to train, one command to run.",
        "Ask: clinical partners to review the questions and thresholds, and access to de-identified local data to validate.",
        f"Team: {a.team} · {a.members}"], 19)
    prs.save(out / "pitch_deck.pptx")

    # ------------- ethics note -------------
    note = f"""# Impact and Ethics Note: Diabetes risk screening (Track 6)
**Team:** {a.team} · {a.members} · Tech Wave 2026

## What it is
A prototype that gives primary-care clinicians a quick, explainable estimate of a person's risk of prediabetes or diabetes from 16 simple questions, with a suggested follow-up date. It is a **prototype, not a diagnosis and not a replacement for clinical judgement or medical advice.**

## Who benefits
Adults who would otherwise be diagnosed late (IDF 2024: about 28% of adults with diabetes in Mauritius are undiagnosed, [source]({IDF})); nurses and GPs who need a fast, trustworthy aid; and health planners who can prioritise follow-up.

## Data
Trained only on the public CDC BRFSS 2015 survey ({m['n_rows']:,} responses, {m['prevalence']:.1%} prevalence). **No real patient data was used, and none is collected.** Income, education and US-insurance variables were excluded from the model.

## Results (held-out test set)
ROC-AUC {d['roc_auc']:.2f}; at the screening threshold sensitivity {pct(d['sensitivity'])}, specificity {pct(d['specificity'])}, NPV {pct(d['npv'])}; PPV {pct(d['ppv'])} (screening trades precision for catching cases). Benchmarked against gradient boosting.

## Risks and how we reduce them
| Risk | Mitigation |
|---|---|
| Over-reliance or being read as a diagnosis | Permanent prototype banner in all three languages; wording says "estimated risk"; confirmatory blood test recommended |
| False reassurance | A LOW band still suggests re-screening in 3 years; sensitivity target 80% (not 100%) is stated openly |
| Unfairness across groups | Subgroup audit by sex, age, income and education (see model card); socio-economic variables not used as predictors |
| US-to-Mauritius mismatch | Probabilities labelled as uncalibrated for Mauritius; local validation is step 2 of deployment |
| Privacy | No storage, no accounts, no network use of inputs; users told not to enter names or IDs |
| Translation errors | French and Kreol Morisien text to be reviewed by native speakers and clinicians |

## Fairness: what we can and cannot claim
Sexes are treated alike (sensitivity gap {pct(gaps.get('Sex', {}).get('sensitivity_gap', 0))}). **Age is the main gap:** at the screening threshold the tool flags {pct(young)} of true cases aged 18-39 but {pct(cell('Age band', '70+', 'sensitivity'))} of those 70+, because younger people have low base risk; clinicians should not treat a LOW result in a young adult with strong risk factors as reassurance. Lower-income and less-educated groups are flagged more often (including more false positives), which means a higher referral burden for them even though income and education are not model inputs. The data **has no ethnicity variable**, so fairness across Mauritian communities is **not yet tested**; it is a required step before any pilot.

## Deployment path
1) Public prototype and clinician feedback. 2) Validation and recalibration on de-identified Mauritian data under ethics approval. 3) Supervised pilot in a few primary-care centres, tracking cases found, follow-ups completed and referral burden. 4) Regular re-audit of performance and fairness.
"""
    (out / "impact_and_ethics_note.md").write_text(note)
    print("Wrote", out / "pitch_deck.pptx", "and", out / "impact_and_ethics_note.md")


if __name__ == "__main__":
    main()
