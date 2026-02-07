from fastapi import FastAPI 
from graph import NodeData
from fastapi.middleware.cors import CORSMiddleware
from schemas import mainRequest,riskScoreSchemaRequest, tradeBehaviorRequest
import uvicorn
import joblib
import pandas as pd
model=joblib.load("behavior_model.joblib")
app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def risk_bucket(score):
    if score <= 30:
        return "Stable"
    elif score <= 60:
        return "Medium Risk"
    return "High Risk"

@app.post("/reallocate")
def allocate(req:mainRequest):
    node_data=NodeData()
    base_apy_dict = req.base_apy.model_dump()
    response = node_data.allocate_funds(base_apy_dict)
    return response
    
@app.post("/generate-risk-score")
def generate_riskscore(req: riskScoreSchemaRequest):
    node_data=NodeData()
    response = node_data.generateScore(req.QA)
    return response


@app.post("/analyze-behaviour")
def analyze_behaviour(req: tradeBehaviorRequest):
    behavior_to_score = {
        "normal": 15,
        "panic": 90,
        "fomo": 85,
        "overtrade": 75,
        "revenge": 80
    }
    new_trade = {
        "actionType": req.actionType,
        "tradeSizePct": req.tradeSizePct,
        "marketChangePct_1h": req.marketChangePct_1h,
        "marketChangePct_24h": req.marketChangePct_24h,
        "drawdownPct": req.drawdownPct,
        "timeSinceDropMin": req.timeSinceDropMin,
        "tradesLast24h": req.tradesLast24h
    }
    X = pd.DataFrame([new_trade])
    pred_behavior = model.predict(X)[0]
    score = behavior_to_score[pred_behavior]
    bucket = risk_bucket(score)
    return {
        "predicted_behavior": pred_behavior,
        "risk_score_0_100": score,
        "risk_bucket": bucket
    }



if __name__=="__main__":
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)