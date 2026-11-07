#!/usr/bin/env python3
"""Build the one-page impact and ethics note (docx + pdf) from reports/. Usage:
python tools/make_ethics_note.py --team "Team" --members "A, B, C"
"""
import argparse, json, subprocess
from pathlib import Path
import pandas as pd
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
TEAL, DARK, GREY = RGBColor(0x0F, 0x6B, 0x73), RGBColor(0x10, 0x28, 0x2C), RGBColor(0x53, 0x68, 0x6C)
FS = 10.5


def shade(cell, hex_):
    tcPr = cell._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hex_); tcPr.append(sh)


def run(p, text, bold=False, size=FS, color=DARK, italic=False):
    r = p.add_run(text); r.bold, r.italic = bold, italic
    r.font.size, r.font.color.rgb, r.font.name = Pt(size), color, "Calibri"
    return r


def para(doc, parts, after=3, before=0):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.line_spacing = 1.0
    for t in parts:
        if isinstance(t, str): run(p, t)
        else: run(p, t[0], bold=True)
    return p


def head(doc, text):
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(9); p.paragraph_format.space_after = Pt(3)
    run(p, text.upper(), bold=True, size=10, color=TEAL)
    pPr = p._p.get_or_add_pPr(); b = OxmlElement("w:pBdr"); bt = OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "4"), ("space", "1"), ("color", "0F6B73")): bt.set(qn("w:" + k), v)
    b.append(bt); pPr.append(b)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--team", default="Team name"); ap.add_argument("--members", default="Member 1, Member 2, Member 3")
    a = ap.parse_args()
    m = json.loads((ROOT / "reports/metrics.json").read_text()); d = m["deployed_test"]
    f = pd.read_csv(ROOT / "reports/fairness.csv")
    g = lambda at, gr, c: float(f[(f.attribute == at) & (f.group == gr)][c].iloc[0])
    pc = lambda x: f"{x*100:.0f}%"
    doc = Document(); s = doc.sections[0]
    s.page_width, s.page_height = Inches(8.27), Inches(11.69)  # A4
    s.left_margin = s.right_margin = Inches(0.7); s.top_margin = Inches(0.55); s.bottom_margin = Inches(0.5)

    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0)
    run(p, "Impact and Ethics Note", bold=True, size=18, color=DARK)
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(4)
    run(p, "Diabetes risk screening in primary care · Tech Wave 2026, Track 6 · ", color=GREY, size=9)
    run(p, f"{a.team}: {a.members}", bold=True, color=GREY, size=9)

    para(doc, [("Prototype. ",), "This tool estimates risk to support a clinician. It is not a diagnosis and not a replacement for clinical judgement or medical advice. A blood test (fasting glucose or HbA1c) confirms diabetes."], after=2)

    head(doc, "What it is and who benefits")
    para(doc, ["A model plus a screening tool (live demo, English, Français, Kreol Morisien) that turns 16 simple questions into a LOW, MODERATE or HIGH risk band, shows the factors behind the score, and suggests a follow-up date. ",
               ("Who benefits: ",), "adults who would otherwise be diagnosed late (IDF 2024: 20.1% of Mauritian adults have diabetes and 28.2% of them are undiagnosed); nurses and GPs who need a fast, explainable second opinion; and health planners who can target follow-up."])

    head(doc, "Data, privacy and results")
    para(doc, [("Data: ",), f"public CDC BRFSS 2015 survey, {m['n_rows']:,} responses, {m['prevalence']*100:.1f}% prevalence. No real patient data is used or collected. Income, education and US-insurance variables are not model inputs. ",
               ("Privacy: ",), "no accounts, no storage, no inputs sent to any server; users are told not to enter names or IDs. ",
               ("Results (held-out test set): ",), f"ROC-AUC {d['roc_auc']:.2f} (gradient-boosting benchmark {m['benchmarks']['LightGBM (all 21 features)']['roc_auc']:.2f}); at the screening threshold sensitivity {pc(d['sensitivity'])}, specificity {pc(d['specificity'])}, NPV {pc(d['npv'])}, PPV {pc(d['ppv'])}."])

    head(doc, "Risks and how we reduce them")
    rows = [("Read as a diagnosis, or over-trusted", "Prototype banner in all three languages; wording says \"estimated risk\"; blood-test confirmation advised; clinician decides."),
            ("False reassurance", f"At the screening threshold the tool misses about {pc(1-d['sensitivity'])} of true cases, so even a LOW band suggests re-screening in 3 years. We state this openly."),
            ("Unequal performance by age", f"Only {pc(g('Age band','18-39','sensitivity'))} of true cases aged 18-39 are flagged, versus {pc(g('Age band','70+','sensitivity'))} at 70+, because risk is low in the young. Clinicians should not take a LOW result as reassurance for a younger adult with strong risk factors."),
            ("Unequal burden by income and education", f"Lower-income adults are flagged more often (false-positive rate {pc(g('Income (audit only)','low (1-4)','false_positive_rate'))} vs {pc(g('Income (audit only)','high (7-8)','false_positive_rate'))} for higher income), which means more confirmatory tests for them. Neither variable is a model input; both are audited."),
            ("US data, not Mauritian", "Probabilities are labelled as not calibrated for Mauritius. The data has no ethnicity variable, so fairness across Mauritian communities is untested and must be checked before any pilot."),
            ("Translation errors", "French and Kreol Morisien text to be reviewed by native speakers and a clinician before real use.")]
    t = doc.add_table(rows=0, cols=2); t.autofit = False
    for i, (k, v) in enumerate(rows):
        c = t.add_row().cells; c[0].width, c[1].width = Inches(1.75), Inches(5.1)
        for cell, txt, bd in ((c[0], k, True), (c[1], v, False)):
            cell.paragraphs[0].paragraph_format.space_after = Pt(1); run(cell.paragraphs[0], txt, bold=bd, size=9.5)
        shade(c[0], "DFF0F1")
    for col, wd in zip(t.columns, (Inches(1.75), Inches(5.1))):
        col.width = wd
        for cell in col.cells: cell.width = wd
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
    tblPr = t._tbl.tblPr; bd = OxmlElement("w:tblBorders")
    for e in ("top", "left", "bottom", "right", "insideH", "insideV"):
        x = OxmlElement("w:" + e); x.set(qn("w:val"), "single"); x.set(qn("w:sz"), "4"); x.set(qn("w:color"), "D3DFE0"); bd.append(x)
    tblPr.append(bd)

    head(doc, "How it could be deployed")
    para(doc, [("1. Now: ",), "open-source prototype and clinician feedback. ", ("2. Validate: ",), "recalibrate on de-identified Mauritian data with ethics approval and the Ministry of Health, including community-level fairness and age-specific checks. ",
               ("3. Pilot: ",), "supervised use in a few primary-care centres, measuring cases found, follow-ups completed and referral burden. ", ("4. Maintain: ",), "regular re-audit of accuracy and fairness, with a named clinical owner and a way for clinicians to report errors."])
    p = para(doc, ["Sources: IDF Diabetes Atlas, Mauritius (diabetesatlas.org/data-by-location/country/mauritius); CDC BRFSS 2015 (Kaggle mirror: Diabetes Health Indicators Dataset). Code: see repository README."], before=4, after=0)
    for r in p.runs: r.font.size, r.font.color.rgb = Pt(8.5), GREY

    out = ROOT / "submission"; out.mkdir(exist_ok=True)
    doc.save(out / "impact_and_ethics_note.docx")
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(out), str(out / "impact_and_ethics_note.docx")], capture_output=True)
    print("wrote", out / "impact_and_ethics_note.docx", "+ .pdf")

if __name__ == "__main__":
    main()
