"""Train the SignBridge interpreter-matching model on synthetic sessions.

Every row is a fictional past session between a Deaf patient and a BSL
interpreter. The label says whether the session went well: the interpreter
turned up and both patient and doctor rated it 4 stars or more.

The script writes:
  ml/data/synthetic_sessions.csv   the dummy training data
  src/data/matchingModel.json      weights the web app uses to rank interpreters

Run from the signbridge folder:  python ml/train_matching_model.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SEED = 7
ROWS = 4000
ROOT = Path(__file__).resolve().parent.parent

# Raw inputs the app knows about each interpreter for a given booking.
FEATURES = [
    ("specialtyExperience", "Experience with this treatment area", "log1p"),
    ("similarPatientRating", "Rating from patients with a similar history", None),
    ("onTimeRate", "Deadlines met and appointments attended", None),
    ("recentNoShows", "Missed appointments in the last 90 days", None),
    ("sameRegion", "Signs the patient's regional BSL variety", None),
    ("continuity", "Previous sessions with this patient", None),
    ("weeklyWorkload", "Bookings already this week", None),
]


def generate_sessions(rng: np.random.Generator) -> pd.DataFrame:
    df = pd.DataFrame({
        "specialtyExperience": rng.poisson(rng.uniform(0.5, 25, ROWS)),
        "similarPatientRating": np.clip(rng.normal(4.2, 0.45, ROWS), 1, 5).round(2),
        "onTimeRate": np.clip(rng.beta(18, 1.6, ROWS), 0.5, 1).round(3),
        "recentNoShows": rng.choice([0, 0, 0, 0, 0, 1, 1, 2, 3], ROWS),
        "sameRegion": rng.binomial(1, 0.45, ROWS),
        "continuity": rng.choice([0, 0, 0, 1, 2, 3, 4, 5], ROWS),
        "weeklyWorkload": rng.integers(0, 16, ROWS),
    })
    # Hidden "true" process the model has to recover, plus noise.
    logit = (
        -2.1
        + 0.55 * np.log1p(df.specialtyExperience)
        + 1.15 * (df.similarPatientRating - 4)
        + 6.0 * (df.onTimeRate - 0.9)
        - 0.95 * df.recentNoShows
        + 0.6 * df.sameRegion
        + 0.3 * np.minimum(df.continuity, 3)
        - 0.07 * (df.weeklyWorkload - 6)
        + rng.normal(0, 0.6, ROWS)
    )
    df["goodSession"] = rng.binomial(1, 1 / (1 + np.exp(-logit)))
    return df


def transform(df: pd.DataFrame) -> np.ndarray:
    columns = []
    for name, _, how in FEATURES:
        values = df[name].to_numpy(dtype=float)
        columns.append(np.log1p(values) if how == "log1p" else values)
    return np.column_stack(columns)


def main() -> None:
    rng = np.random.default_rng(SEED)
    sessions = generate_sessions(rng)
    data_path = ROOT / "ml" / "data" / "synthetic_sessions.csv"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    sessions.to_csv(data_path, index=False)

    X = transform(sessions)
    y = sessions.goodSession.to_numpy()
    X_train, X_test, y_train, y_test, raw_train, raw_test = train_test_split(
        X, y, sessions, test_size=0.25, random_state=SEED, stratify=y,
    )

    scaler = StandardScaler().fit(X_train)
    model = LogisticRegression(max_iter=1000).fit(scaler.transform(X_train), y_train)
    probabilities = model.predict_proba(scaler.transform(X_test))[:, 1]

    # A non-linear model for comparison only: if it were much better, a simple
    # explainable model would be hiding something.
    boosted = GradientBoostingClassifier(random_state=SEED).fit(X_train, y_train)
    boosted_auc = roc_auc_score(y_test, boosted.predict_proba(X_test)[:, 1])

    test_vectors = [
        {"x": {name: float(raw_test.iloc[i][name]) for name, _, _ in FEATURES}, "p": float(probabilities[i])}
        for i in range(5)
    ]

    exported = {
        "model": "LogisticRegression",
        "library": f"scikit-learn {sklearn.__version__}",
        "trainingRows": int(len(X_train)),
        "testRows": int(len(X_test)),
        "positiveRate": round(float(y.mean()), 3),
        "metrics": {
            "testAuc": round(float(roc_auc_score(y_test, probabilities)), 3),
            "testAccuracy": round(float(accuracy_score(y_test, probabilities >= 0.5)), 3),
            "gradientBoostingAuc": round(float(boosted_auc), 3),
        },
        "intercept": float(model.intercept_[0]),
        "features": [
            {
                "name": name,
                "label": label,
                "transform": how,
                "mean": float(scaler.mean_[i]),
                "scale": float(scaler.scale_[i]),
                "coef": float(model.coef_[0][i]),
            }
            for i, (name, label, how) in enumerate(FEATURES)
        ],
        "testVectors": test_vectors,
    }
    out_path = ROOT / "src" / "data" / "matchingModel.json"
    out_path.write_text(json.dumps(exported, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(sessions)} synthetic sessions to {data_path.relative_to(ROOT)}")
    print(f"Logistic regression test AUC {exported['metrics']['testAuc']}, "
          f"accuracy {exported['metrics']['testAccuracy']} "
          f"(gradient boosting AUC {exported['metrics']['gradientBoostingAuc']})")
    for feature in exported["features"]:
        print(f"  {feature['name']:<22} coef {feature['coef']:+.3f}")
    print(f"Wrote model to {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
