#!/usr/bin/env python3
"""Build web/index.html: a single-file, no-install version of the screening tool.

Embeds models/model.json, reports/metrics.json and reports/fairness.csv so the numbers
always match the trained model.    python tools/build_web.py
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "app"))
from i18n import T  # noqa: E402

FEATNAME = {
    "en": {"HighBP": "High blood pressure", "HighChol": "High cholesterol", "BMI": "BMI", "Smoker": "Smoking history",
           "Stroke": "Previous stroke", "HeartDiseaseorAttack": "Heart disease / attack", "PhysActivity": "Physical activity",
           "Fruits": "Daily fruit", "Veggies": "Daily vegetables", "HvyAlcoholConsump": "Heavy drinking",
           "GenHlth": "General health", "MentHlth": "Poor mental-health days", "PhysHlth": "Poor physical-health days",
           "DiffWalk": "Difficulty walking", "Sex": "Sex", "Age": "Age"},
    "fr": {"HighBP": "Tension élevée", "HighChol": "Cholestérol élevé", "BMI": "IMC", "Smoker": "Antécédent tabagique",
           "Stroke": "AVC antérieur", "HeartDiseaseorAttack": "Maladie cardiaque / infarctus", "PhysActivity": "Activité physique",
           "Fruits": "Fruits quotidiens", "Veggies": "Légumes quotidiens", "HvyAlcoholConsump": "Forte consommation d'alcool",
           "GenHlth": "Santé générale", "MentHlth": "Jours de mauvaise santé mentale", "PhysHlth": "Jours de mauvaise santé physique",
           "DiffWalk": "Difficulté à marcher", "Sex": "Sexe", "Age": "Âge"},
    "mfe": {"HighBP": "Pression ot", "HighChol": "Kolesterol ot", "BMI": "BMI", "Smoker": "Listwar sigaret",
            "Stroke": "AVC avan", "HeartDiseaseorAttack": "Maladi kor / atak kardiak", "PhysActivity": "Aktivite fizik",
            "Fruits": "Fri sak zour", "Veggies": "Legim sak zour", "HvyAlcoholConsump": "Bwar lalkol tro boukou",
            "GenHlth": "Lasante zeneral", "MentHlth": "Zour lasante mantal move", "PhysHlth": "Zour lasante fizik move",
            "DiffWalk": "Difikilte pou marse", "Sex": "Sex", "Age": "Laz"},
}
EXTRA = {
    "en": {"example": "Example patient", "reset": "New patient (clear)", "gcal": "Add to Google Calendar", "copy": "Copy reminder text",
           "copied": "Copied.", "sens": "Sensitivity", "spec": "Specificity", "fpr": "False positives", "prev": "Prevalence",
           "footer": "Prototype for a hackathon. Not medical advice."},
    "fr": {"example": "Patient exemple", "reset": "Nouveau patient (effacer)", "gcal": "Ajouter à Google Agenda", "copy": "Copier le texte du rappel",
           "copied": "Copié.", "sens": "Sensibilité", "spec": "Spécificité", "fpr": "Faux positifs", "prev": "Prévalence",
           "footer": "Prototype de hackathon. Pas un avis médical."},
    "mfe": {"example": "Pasian egzanp", "reset": "Nouvo pasian (efas)", "gcal": "Azoute dan Google Calendar", "copy": "Kopye tekst rapel",
            "copied": "Finn kopye.", "sens": "Sansibilite", "spec": "Spesifisite", "fpr": "Fos pozitif", "prev": "Prevalans",
            "footer": "Prototip hackathon. Pa enn konsey medikal."},
}


def main():
    model = json.loads((ROOT / "models" / "model.json").read_text())
    metrics = json.loads((ROOT / "reports" / "metrics.json").read_text())
    fair = pd.read_csv(ROOT / "reports" / "fairness.csv").round(4).to_dict("records")
    html = (ROOT / "tools" / "web_template.html").read_text()
    dump = lambda o: json.dumps(o, ensure_ascii=False)
    html = (html.replace("__I18N__", dump(T)).replace("__FEATNAME__", dump(FEATNAME)).replace("__EXTRA__", dump(EXTRA))
            .replace("__MODEL__", dump(model)).replace("__METRICS__", dump(metrics)).replace("__FAIR__", dump(fair)))
    assert not re.search(r"__[A-Z0-9]+__", html), "unreplaced placeholder"
    out = ROOT / "web"
    out.mkdir(exist_ok=True)
    (out / "index.html").write_text(html)
    wrap = ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body>" + html + "</body></html>")
    (out / "standalone.html").write_text(wrap)
    print("wrote", out / "index.html", "and standalone.html", f"({len(html) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
