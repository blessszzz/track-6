#!/usr/bin/env python3
"""Create a SYNTHETIC stand-in for the BRFSS 2015 'binary health indicators' CSV.

Only for testing the pipeline when the real CSVs are not at hand. It has the same
21 feature columns + Diabetes_binary, and a plausible (not real) risk structure.
Never report results from this file. Use the real BRFSS CSVs for the submission.

    python tools/make_dummy_data.py data/ --rows 60000
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("--rows", type=int, default=60000)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    n = a.rows

    age = rng.integers(1, 14, n)
    sex = rng.integers(0, 2, n)
    income = rng.integers(1, 9, n)
    edu = rng.integers(1, 7, n)
    bmi = np.clip(rng.normal(26 + 0.25 * age / 3, 5.5, n), 15, 70).round()
    genhlth = np.clip(np.round(rng.normal(2.5 + 0.08 * age + 0.03 * (bmi - 26), 1.0)), 1, 5).astype(int)
    highbp = (rng.random(n) < 0.12 + 0.03 * age + 0.01 * (bmi - 26).clip(0)).astype(int)
    highchol = (rng.random(n) < 0.15 + 0.025 * age).astype(int)
    smoker = (rng.random(n) < 0.44).astype(int)
    stroke = (rng.random(n) < 0.01 + 0.004 * age).astype(int)
    heart = (rng.random(n) < 0.015 + 0.008 * age).astype(int)
    phys = (rng.random(n) < 0.85 - 0.01 * age).astype(int)
    fruits = (rng.random(n) < 0.63).astype(int)
    veg = (rng.random(n) < 0.81).astype(int)
    alc = (rng.random(n) < 0.06).astype(int)
    anyhc = (rng.random(n) < 0.95).astype(int)
    nodoc = (rng.random(n) < 0.08).astype(int)
    cholchk = (rng.random(n) < 0.96).astype(int)
    ment = np.where(rng.random(n) < 0.7, 0, rng.integers(1, 31, n))
    physh = np.where(rng.random(n) < 0.65, 0, rng.integers(1, 31, n))
    diffw = (rng.random(n) < 0.05 + 0.02 * (genhlth - 1)).astype(int)

    logit = (-6.2 + 0.18 * age + 0.07 * (bmi - 26) + 0.9 * highbp + 0.6 * highchol
             + 0.45 * (genhlth - 1) / 1.0 * 0.6 + 0.4 * heart + 0.25 * diffw + 0.2 * sex
             - 0.2 * phys - 0.1 * fruits - 0.1 * veg + 0.1 * stroke)
    p = 1 / (1 + np.exp(-logit))
    y = (rng.random(n) < p).astype(int)

    df = pd.DataFrame({
        "Diabetes_binary": y.astype(float), "HighBP": highbp.astype(float), "HighChol": highchol.astype(float),
        "CholCheck": cholchk.astype(float), "BMI": bmi.astype(float), "Smoker": smoker.astype(float),
        "Stroke": stroke.astype(float), "HeartDiseaseorAttack": heart.astype(float),
        "PhysActivity": phys.astype(float), "Fruits": fruits.astype(float), "Veggies": veg.astype(float),
        "HvyAlcoholConsump": alc.astype(float), "AnyHealthcare": anyhc.astype(float),
        "NoDocbcCost": nodoc.astype(float), "GenHlth": genhlth.astype(float), "MentHlth": ment.astype(float),
        "PhysHlth": physh.astype(float), "DiffWalk": diffw.astype(float), "Sex": sex.astype(float),
        "Age": age.astype(float), "Education": edu.astype(float), "Income": income.astype(float),
    })
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / "diabetes_binary_health_indicators_BRFSS2015.csv"
    df.to_csv(path, index=False)
    print(f"wrote {path}  rows={len(df)}  prevalence={df.Diabetes_binary.mean():.3f}  (SYNTHETIC TEST DATA)")


if __name__ == "__main__":
    main()
