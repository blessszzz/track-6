#!/usr/bin/env python3
"""Train the explainable diabetes-risk model on the public BRFSS 2015 data.

    python src/train.py --data-dir data

Outputs
  models/model.json        deployed model (transparent logistic regression + thresholds)
  reports/metrics.json     all numbers used by the app model card and the deck
  reports/fairness.csv     subgroup audit
  reports/figures/*.png    ROC/PR, calibration, fairness, odds ratios

Design choices (all explained in README / ethics note)
  * Deployed model = logistic regression trained on the NATURAL (unbalanced) data, so its
    probabilities are calibrated to the real prevalence. A 50/50 model would overstate risk.
  * Gradient boosting (LightGBM) is trained only as a benchmark to show what we give up for
    transparency.
  * Income and Education are NOT used as predictors (socio-economic proxies, US-specific scales)
    and neither are US insurance variables. They are kept ONLY to audit fairness.
"""
import argparse
import datetime as dt
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.calibration import calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss,
                             precision_recall_curve, roc_auc_score, roc_curve)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
TARGET = "Diabetes_binary"

# 16 predictors usable in a Mauritian clinic and answerable by the patient/nurse in 2 minutes
FEATURES = ["HighBP", "HighChol", "BMI", "Smoker", "Stroke", "HeartDiseaseorAttack", "PhysActivity",
            "Fruits", "Veggies", "HvyAlcoholConsump", "GenHlth", "MentHlth", "PhysHlth", "DiffWalk",
            "Sex", "Age"]
# all 21 BRFSS predictors (used only for the benchmark ablation)
ALL21 = FEATURES + ["CholCheck", "AnyHealthcare", "NoDocbcCost", "Education", "Income"]

AGE_BANDS = {**{k: "18-39" for k in range(1, 5)}, **{k: "40-54" for k in range(5, 8)},
             **{k: "55-69" for k in range(8, 11)}, **{k: "70+" for k in range(11, 14)}}


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def find_csv(data_dir, must, forbid=()):
    for p in sorted(Path(data_dir).glob("*.csv")):
        n = norm(p.name)
        if all(m in n for m in must) and not any(f in n for f in forbid):
            return p
    return None


def rates(y, p, t):
    pred = p >= t
    tp = int(((pred) & (y == 1)).sum()); fp = int(((pred) & (y == 0)).sum())
    tn = int(((~pred) & (y == 0)).sum()); fn = int(((~pred) & (y == 1)).sum())
    div = lambda a, b: float(a / b) if b else float("nan")
    return {"sensitivity": div(tp, tp + fn), "specificity": div(tn, tn + fp),
            "ppv": div(tp, tp + fp), "npv": div(tn, tn + fn), "flagged_rate": div(tp + fp, len(y))}


def scores(y, p):
    return {"roc_auc": float(roc_auc_score(y, p)), "pr_auc": float(average_precision_score(y, p)),
            "brier": float(brier_score_loss(y, p))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(ROOT / "data"))
    ap.add_argument("--target-sens", type=float, default=0.80, help="screen-positive sensitivity on validation set")
    ap.add_argument("--target-ppv", type=float, default=0.35, help="PPV used for the HIGH band")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()

    path = find_csv(a.data_dir, ["diabetesbinary", "healthindicators"], forbid=["5050"])
    if path is None:
        raise SystemExit(f"Could not find the unbalanced binary CSV in {a.data_dir}. "
                         "Expected a file like diabetes_binary_health_indicators_BRFSS2015.csv")
    df = pd.read_csv(path)
    missing = [c for c in [TARGET] + ALL21 if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing columns: {missing}")
    print(f"Loaded {path.name}: {len(df):,} rows, prevalence {df[TARGET].mean():.3%}")

    y = df[TARGET].astype(int)
    idx_tr, idx_tmp = train_test_split(df.index, test_size=0.4, stratify=y, random_state=a.seed)
    idx_va, idx_te = train_test_split(idx_tmp, test_size=0.5, stratify=y.loc[idx_tmp], random_state=a.seed)
    tr, va, te = df.loc[idx_tr], df.loc[idx_va], df.loc[idx_te]
    print(f"split train/val/test = {len(tr):,}/{len(va):,}/{len(te):,}")

    # ---- deployed model: standardised logistic regression, no class weights (=> calibrated) ----
    scaler = StandardScaler().fit(tr[FEATURES])
    lr = LogisticRegression(max_iter=2000, C=1.0)
    lr.fit(scaler.transform(tr[FEATURES]), tr[TARGET])
    p_va = lr.predict_proba(scaler.transform(va[FEATURES]))[:, 1]
    p_te = lr.predict_proba(scaler.transform(te[FEATURES]))[:, 1]
    y_va, y_te = va[TARGET].values.astype(int), te[TARGET].values.astype(int)

    # ---- thresholds chosen on VALIDATION only ----
    prec, rec, thr = precision_recall_curve(y_va, p_va)
    ok = np.where(rec[:-1] >= a.target_sens)[0]
    t_screen = float(thr[ok[-1]]) if len(ok) else float(thr[0])
    ok2 = np.where((prec[:-1] >= a.target_ppv) & (thr > t_screen))[0]
    t_high = float(thr[ok2[0]]) if len(ok2) else min(0.99, t_screen * 1.8)
    print(f"thresholds: screen-positive >= {t_screen:.3f}, high band >= {t_high:.3f}")

    deployed = {**scores(y_te, p_te), **rates(y_te, p_te, t_screen)}
    deployed_high = rates(y_te, p_te, t_high)

    # ---- benchmarks: logistic(16) vs LightGBM(16) vs LightGBM(all 21) ----
    bench = {"Logistic (16 features) - deployed": scores(y_te, p_te)}
    try:
        import lightgbm as lgb
        for name, cols in [("LightGBM (16 features)", FEATURES), ("LightGBM (all 21 features)", ALL21)]:
            m = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.05, num_leaves=31,
                                   subsample=0.8, colsample_bytree=0.8, random_state=a.seed, verbose=-1)
            m.fit(tr[cols], tr[TARGET])
            bench[name] = scores(y_te, m.predict_proba(te[cols])[:, 1])
    except Exception as e:  # lightgbm missing is not fatal
        print("LightGBM benchmark skipped:", e)

    # ---- fairness audit on test set (audit-only attributes included) ----
    te_a = te.copy()
    te_a["_p"] = p_te
    te_a["_flag"] = (p_te >= t_screen).astype(int)
    groupings = {
        "Sex": te_a["Sex"].map({0: "Female", 1: "Male"}),
        "Age band": te_a["Age"].astype(int).map(AGE_BANDS),
        "Income (audit only)": pd.cut(te_a["Income"], [0, 4, 6, 8], labels=["low (1-4)", "mid (5-6)", "high (7-8)"]),
        "Education (audit only)": pd.cut(te_a["Education"], [0, 4, 6], labels=["<= high school (1-4)", "some college+ (5-6)"]),
    }
    rows = []
    for gname, gs in groupings.items():
        for lvl in sorted(gs.dropna().unique(), key=str):
            m = (gs == lvl).values
            yy, pp = te_a[TARGET].values[m].astype(int), p_te[m]
            if len(yy) < 50 or yy.sum() == 0 or yy.sum() == len(yy):
                continue
            r = rates(yy, pp, t_screen)
            rows.append({"attribute": gname, "group": str(lvl), "n": int(len(yy)),
                         "prevalence": float(yy.mean()), "roc_auc": float(roc_auc_score(yy, pp)),
                         "sensitivity": r["sensitivity"], "false_positive_rate": 1 - r["specificity"],
                         "flagged_rate": r["flagged_rate"], "mean_predicted_risk": float(pp.mean())})
    fair = pd.DataFrame(rows)
    fair.to_csv(ROOT / "reports" / "fairness.csv", index=False)
    gaps = {}
    for g, sub in fair.groupby("attribute"):
        gaps[g] = {"sensitivity_gap": float(sub.sensitivity.max() - sub.sensitivity.min()),
                   "fpr_gap": float(sub.false_positive_rate.max() - sub.false_positive_rate.min())}

    # ---- optional: why we do not deploy the 50/50 model ----
    cmp5050 = None
    p5050 = find_csv(a.data_dir, ["5050"])
    if p5050 is not None:
        d5 = pd.read_csv(p5050)
        if all(c in d5.columns for c in FEATURES + [TARGET]):
            s5 = StandardScaler().fit(d5[FEATURES])
            l5 = LogisticRegression(max_iter=2000).fit(s5.transform(d5[FEATURES]), d5[TARGET])
            pp5 = l5.predict_proba(s5.transform(te[FEATURES]))[:, 1]
            cmp5050 = {"file": p5050.name, "true_prevalence_test": float(y_te.mean()),
                       "mean_predicted_risk_5050_model": float(pp5.mean()),
                       "mean_predicted_risk_deployed_model": float(p_te.mean()),
                       "roc_auc_5050_model": float(roc_auc_score(y_te, pp5)),
                       "note": "5050 file is a resample of the same survey, so use only for the calibration point."}

    # ---- figures ----
    fig_dir = ROOT / "reports" / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
    teal, grey = "#1f6f78", "#8a8f98"

    fpr, tpr, _ = roc_curve(y_te, p_te)
    pr, rc, _ = precision_recall_curve(y_te, p_te)
    fig, ax = plt.subplots(1, 2, figsize=(9, 3.8))
    ax[0].plot(fpr, tpr, color=teal, lw=2); ax[0].plot([0, 1], [0, 1], "--", color=grey)
    ax[0].set(title=f"ROC (AUC {deployed['roc_auc']:.3f})", xlabel="False-positive rate", ylabel="Sensitivity")
    ax[1].plot(rc, pr, color=teal, lw=2); ax[1].axhline(y_te.mean(), ls="--", color=grey)
    ax[1].set(title=f"Precision-recall (AP {deployed['pr_auc']:.3f})", xlabel="Recall", ylabel="Precision")
    fig.tight_layout(); fig.savefig(fig_dir / "roc_pr.png", dpi=160); plt.close(fig)

    fo, mp = calibration_curve(y_te, p_te, n_bins=10, strategy="quantile")
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    ax.plot(mp, fo, "o-", color=teal); ax.plot([0, max(mp.max(), fo.max())] * 1, [0, max(mp.max(), fo.max())], "--", color=grey)
    ax.set(title="Calibration (test set)", xlabel="Predicted risk", ylabel="Observed rate")
    fig.tight_layout(); fig.savefig(fig_dir / "calibration.png", dpi=160); plt.close(fig)

    if len(fair):
        lab = fair["attribute"].str.replace(" (audit only)", "", regex=False) + ": " + fair["group"]
        fig, ax = plt.subplots(figsize=(7.5, 0.38 * len(fair) + 1.2))
        ax.barh(lab[::-1], fair["sensitivity"][::-1], color=teal)
        ax.axvline(deployed["sensitivity"], ls="--", color=grey)
        ax.set(xlim=(0, 1), xlabel="Sensitivity at screen-positive threshold (dashed = overall)",
               title="Fairness audit: share of true cases flagged")
        fig.tight_layout(); fig.savefig(fig_dir / "fairness_sensitivity.png", dpi=160); plt.close(fig)

    orr = pd.Series(np.exp(lr.coef_[0]), index=FEATURES).sort_values()
    fig, ax = plt.subplots(figsize=(6.5, 5))
    ax.barh(orr.index, orr.values - 1, left=1, color=[teal if v > 1 else grey for v in orr.values])
    ax.axvline(1, color="black", lw=0.8)
    ax.set(title="Odds ratio per +1 SD of each factor", xlabel="Odds ratio (1 = no effect)")
    fig.tight_layout(); fig.savefig(fig_dir / "odds_ratios.png", dpi=160); plt.close(fig)

    # ---- save deployed model as plain JSON (auditable, no pickles) ----
    model = {
        "version": "1.0", "type": "logistic_regression", "trained_on": "BRFSS 2015 (CDC, public survey)",
        "trained_at": dt.datetime.now().isoformat(timespec="seconds"),
        "features": FEATURES, "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
        "coef": lr.coef_[0].tolist(), "intercept": float(lr.intercept_[0]),
        "threshold_screen": t_screen, "threshold_high": t_high,
        "prevalence_train": float(tr[TARGET].mean()),
    }
    (ROOT / "models").mkdir(exist_ok=True)
    (ROOT / "models" / "model.json").write_text(json.dumps(model, indent=2))

    metrics = {
        "data_file": path.name, "n_rows": int(len(df)), "prevalence": float(df[TARGET].mean()),
        "split": {"train": len(tr), "val": len(va), "test": len(te)},
        "features_used": FEATURES, "excluded_from_model": ["Income", "Education", "CholCheck", "AnyHealthcare", "NoDocbcCost"],
        "thresholds": {"screen": t_screen, "high": t_high, "target_sensitivity": a.target_sens, "target_ppv_high": a.target_ppv},
        "deployed_test": deployed, "high_band_test": deployed_high, "benchmarks": bench,
        "fairness_gaps": gaps, "compare_5050": cmp5050,
        "coef_odds_ratio_per_sd": {f: float(np.exp(c)) for f, c in zip(FEATURES, lr.coef_[0])},
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
    }
    (ROOT / "reports" / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print("\n=== TEST SET RESULTS (deployed logistic model) ===")
    for k, v in deployed.items():
        print(f"  {k:14s} {v:.3f}")
    print("benchmarks:", {k: round(v['roc_auc'], 3) for k, v in bench.items()})
    print("fairness gaps:", gaps)
    if cmp5050:
        print("50/50 model mean predicted risk %.3f vs true prevalence %.3f" %
              (cmp5050["mean_predicted_risk_5050_model"], cmp5050["true_prevalence_test"]))
    print("\nSaved models/model.json, reports/metrics.json, reports/fairness.csv, reports/figures/*.png")


if __name__ == "__main__":
    main()
