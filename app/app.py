"""Diabetes risk screening prototype (Streamlit). Run:  streamlit run app/app.py"""
import datetime as dt
import json
import math
import sys
import uuid
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n import LANGS, T  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "model.json"
METRICS_PATH = ROOT / "reports" / "metrics.json"
FAIR_PATH = ROOT / "reports" / "fairness.csv"
FIG_DIR = ROOT / "reports" / "figures"

st.set_page_config(page_title="Diabetes risk screening", page_icon="🩺", layout="wide")

# ---------- language ----------
lang = st.sidebar.radio("🌐 Language / Langue / Lang", list(LANGS), format_func=LANGS.get, index=0)
t = T[lang]

st.markdown(
    """<style>
    .block-container {padding-top: 1.6rem; max-width: 1150px;}
    .banner {background:#fff4e5; border-left:6px solid #e8890c; padding:.7rem 1rem; border-radius:6px; color:#5c3b00;}
    .privacy {background:#e8f3f4; border-left:6px solid #1f6f78; padding:.6rem 1rem; border-radius:6px; color:#0f3d42;}
    .band {padding:1.1rem 1.3rem; border-radius:10px; color:white; font-weight:700; font-size:1.5rem;}
    </style>""", unsafe_allow_html=True)

st.title("🩺 " + t["title"])
st.caption(t["subtitle"])
st.markdown(f'<div class="banner">{t["disclaimer"]}</div>', unsafe_allow_html=True)
st.write("")
st.markdown(f'<div class="privacy">{t["privacy"]}</div>', unsafe_allow_html=True)

if not MODEL_PATH.exists():
    st.error(t["no_model"])
    st.stop()
model = json.loads(MODEL_PATH.read_text())
FEATS = model["features"]

# short value-aware names for the explanation list
FEAT_NAME = {
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
}[lang]


def age_to_code(years: int) -> int:
    """BRFSS 13-level age category (1 = 18-24, 2 = 25-29, ... 13 = 80+)."""
    if years < 25:
        return 1
    return min(13, 2 + (years - 25) // 5)


def sigmoid(x):
    return 1 / (1 + math.exp(-x))


def make_ics(title, desc, day: dt.date) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    nxt = day + dt.timedelta(days=1)
    return "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tech Wave 2026//Diabetes screening prototype//EN",
        "BEGIN:VEVENT", f"UID:{uuid.uuid4()}@diabetes-screen-mu", f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{day:%Y%m%d}", f"DTEND;VALUE=DATE:{nxt:%Y%m%d}",
        f"SUMMARY:{title}", f"DESCRIPTION:{desc}",
        "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", f"DESCRIPTION:{title}", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"])


tab_screen, tab_model = st.tabs([t["tab_screen"], t["tab_model"]])

# =====================================================================  SCREENING TAB
with tab_screen:
    yn = lambda label, key, default=False: st.radio(label, [0, 1], index=int(default), horizontal=True,
                                                    format_func=lambda v: t["yes"] if v else t["no"], key=key)
    with st.form("screen"):
        st.subheader(t["section_profile"])
        c1, c2, c3, c4 = st.columns(4)
        age = c1.number_input(t["age"], 18, 100, 45, step=1)
        sex = c2.radio(t["sex"], [0, 1], format_func=lambda v: t["male"] if v else t["female"], horizontal=True)
        height = c3.number_input(t["height"], 120, 220, 168)
        weight = c4.number_input(t["weight"], 30.0, 250.0, 75.0, step=0.5)
        bmi = weight / ((height / 100) ** 2)
        st.caption(f"{t['bmi']}: **{bmi:.1f}**")

        st.subheader(t["section_health"])
        a, b = st.columns(2)
        with a:
            highbp = yn(t["HighBP"], "bp")
            highchol = yn(t["HighChol"], "chol")
            stroke = yn(t["Stroke"], "stroke")
        with b:
            heart = yn(t["HeartDiseaseorAttack"], "heart")
            diffw = yn(t["DiffWalk"], "diffw")
            genh = st.select_slider(t["GenHlth"], options=[1, 2, 3, 4, 5], value=3,
                                    format_func=lambda v: t["genh_opts"][v - 1])

        st.subheader(t["section_life"])
        a, b = st.columns(2)
        with a:
            smoker = yn(t["Smoker"], "smk")
            phys = yn(t["PhysActivity"], "pa", True)
            alc = yn(t["HvyAlcoholConsump"], "alc")
        with b:
            fruits = yn(t["Fruits"], "fr", True)
            veg = yn(t["Veggies"], "vg", True)
            ment = st.slider(t["MentHlth"], 0, 30, 0)
            physh = st.slider(t["PhysHlth"], 0, 30, 0)
        go = st.form_submit_button(t["calc"], type="primary")

    if go:
        vals = {"HighBP": highbp, "HighChol": highchol, "BMI": round(bmi, 1), "Smoker": smoker, "Stroke": stroke,
                "HeartDiseaseorAttack": heart, "PhysActivity": phys, "Fruits": fruits, "Veggies": veg,
                "HvyAlcoholConsump": alc, "GenHlth": genh, "MentHlth": ment, "PhysHlth": physh,
                "DiffWalk": diffw, "Sex": sex, "Age": age_to_code(int(age))}
        contrib = {}
        logit = model["intercept"]
        for f, m, s, c in zip(FEATS, model["mean"], model["scale"], model["coef"]):
            z = (vals[f] - m) / s
            contrib[f] = c * z
            logit += c * z
        p = sigmoid(logit)

        if p >= model["threshold_high"]:
            band, colour, follow_key, months = t["band_high"], "#b3261e", "follow_high", 1
        elif p >= model["threshold_screen"]:
            band, colour, follow_key, months = t["band_mod"], "#c77700", "follow_mod", 12
        else:
            band, colour, follow_key, months = t["band_low"], "#2e7d32", "follow_low", 36

        st.subheader(t["result"])
        r1, r2 = st.columns([1, 1])
        with r1:
            st.markdown(f'<div class="band" style="background:{colour}">{band}</div>', unsafe_allow_html=True)
            st.metric(t["risk_est"], f"{p * 100:.1f} %")
            st.caption(t["risk_note"])
        with r2:
            ranked = sorted(contrib.items(), key=lambda kv: kv[1], reverse=True)
            ups = [(f, c) for f, c in ranked if c > 0.02][:4]
            downs = [(f, c) for f, c in reversed(ranked) if c < -0.02][:4]

            def fmt(f, c):
                v = vals[f]
                if f == "BMI":
                    vs = f"{v:.1f}"
                elif f == "Age":
                    vs = f"{int(age)}"
                elif f == "GenHlth":
                    vs = t["genh_opts"][int(v) - 1]
                elif f == "Sex":
                    vs = t["male"] if v else t["female"]
                elif f in ("MentHlth", "PhysHlth"):
                    vs = f"{int(v)}"
                else:
                    vs = t["yes"] if v else t["no"]
                return f"- **{FEAT_NAME[f]}** ({vs}) → ×{math.exp(c):.2f}"

            st.markdown(f"**⬆ {t['factors_up']}**  \n<small>{t['vs_avg']}</small>", unsafe_allow_html=True)
            st.markdown("\n".join(fmt(f, c) for f, c in ups) or f"- {t['none']}")
            st.markdown(f"**⬇ {t['factors_down']}**")
            st.markdown("\n".join(fmt(f, c) for f, c in downs) or f"- {t['none']}")

        st.markdown(f"##### {t['chart_title']}")
        chart = pd.Series({FEAT_NAME[f]: c for f, c in contrib.items()}).sort_values()
        st.bar_chart(chart, horizontal=True, height=380)

        today = dt.date.today()
        due = today + dt.timedelta(days=int(30.4 * months))
        st.markdown(f"#### {t['follow']}")
        st.info(f"{t[follow_key]}  \n**{t['follow_date']}: {due:%d %b %Y}**  \n<small>{t['follow_basis']}</small>")
        st.download_button(t["download_ics"], make_ics(t["ics_title"], t["ics_desc"], due),
                           file_name="diabetes_followup.ics", mime="text/calendar")

# =====================================================================  MODEL CARD TAB
with tab_model:
    st.subheader(t["tab_model"])
    st.write(t["mc_intro"])
    if not METRICS_PATH.exists():
        st.warning(t["no_model"])
    else:
        mt = json.loads(METRICS_PATH.read_text())
        d = mt["deployed_test"]
        st.markdown(f"##### {t['mc_data']}")
        st.write(f"BRFSS 2015 (CDC) · {mt['n_rows']:,} · prevalence {mt['prevalence']:.1%} · "
                 f"train/val/test = {mt['split']['train']:,}/{mt['split']['val']:,}/{mt['split']['test']:,}")
        st.markdown(f"##### {t['mc_perf']}")
        c = st.columns(5)
        c[0].metric("ROC-AUC", f"{d['roc_auc']:.3f}")
        c[1].metric("PR-AUC", f"{d['pr_auc']:.3f}")
        c[2].metric("Sensitivity", f"{d['sensitivity']:.0%}")
        c[3].metric("Specificity", f"{d['specificity']:.0%}")
        c[4].metric("Brier", f"{d['brier']:.3f}")
        if (FIG_DIR / "roc_pr.png").exists():
            g1, g2 = st.columns([3, 2])
            g1.image(str(FIG_DIR / "roc_pr.png"))
            if (FIG_DIR / "calibration.png").exists():
                g2.image(str(FIG_DIR / "calibration.png"))
        st.markdown(f"##### {t['mc_bench']}")
        st.dataframe(pd.DataFrame(mt["benchmarks"]).T.rename(columns=str.upper).round(3), width='stretch')
        st.markdown(f"##### {t['mc_fair']}")
        st.caption(t["mc_fair_note"])
        if FAIR_PATH.exists():
            st.dataframe(pd.read_csv(FAIR_PATH).round(3), width='stretch', hide_index=True)
        if (FIG_DIR / "fairness_sensitivity.png").exists():
            st.image(str(FIG_DIR / "fairness_sensitivity.png"))
        if (FIG_DIR / "odds_ratios.png").exists():
            st.image(str(FIG_DIR / "odds_ratios.png"), width=520)
        st.markdown(f"##### {t['mc_limits']}")
        for item in t["mc_limits_list"]:
            st.markdown(f"- {item}")
