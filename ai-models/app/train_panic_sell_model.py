import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression


# =============================
# 1) Load dataset
# =============================
df = pd.read_excel("behaviour_data.xlsx") 

# Convert BUY/SELL to numeric
df["actionType"] = df["actionType"].map({"BUY": 0, "SELL": 1})

# Feature engineering
df["tradeSizePct"] = df["tradeAmountUSD"] / df["portfolioValueUSD"]

# =============================
# 2) Features + Labels
# =============================
features = [
    "actionType",
    "tradeSizePct",
    "marketChangePct_1h",
    "marketChangePct_24h",
    "drawdownPct",
    "timeSinceDropMin",
    "tradesLast24h"   
]

X = df[features]
y = df["label"]  # normal / panic / fomo / revenge / overtrade

# =============================
# 3) Train/test split
# =============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# =============================
# 4) Train model (multi-class)
# =============================
model = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", LogisticRegression(max_iter=4000))
])

model.fit(X_train, y_train)

# =============================
# 5) Evaluate
# =============================
preds = model.predict(X_test)
print("\n===== Classification Report =====")
print(classification_report(y_test, preds))

# =============================
# 6) Convert predicted behavior -> score out of 100
# =============================
# You can tune these scores anytime
behavior_to_score = {
    "normal": 15,      # stable
    "panic": 90,       # high risk
    "fomo": 85,        # high risk
    "overtrade": 75,   # high risk
    "revenge": 80      # high risk
}

def risk_bucket(score):
    if score <= 30:
        return "Stable (0-30)"
    elif score <= 60:
        return "Medium Risk (31-60)"
    else:
        return "High Risk (61-100)"

# =============================
# 7) Predict score for each trade (example output)
# =============================
test_behaviors = model.predict(X_test)

scores = [behavior_to_score[b] for b in test_behaviors]
buckets = [risk_bucket(s) for s in scores]

result_df = X_test.copy()
result_df["predicted_behavior"] = test_behaviors
result_df["risk_score_0_100"] = scores
result_df["risk_bucket"] = buckets

print("\n===== Sample Predictions (First 10) =====")
print(result_df.head(10))

# =============================
# 8) Save model
# =============================
joblib.dump(model, "behavior_model.joblib")
print("\n✅ Model saved as behavior_model.joblib")
