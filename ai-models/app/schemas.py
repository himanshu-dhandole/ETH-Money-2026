from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class riskScoreSchemaRequest(BaseModel):
    QA: Dict[str, str] 

class riskScoreSchemaResponse(BaseModel):
    risk_score:dict

class HistoricalData(BaseModel):
    avgAPY: float
    volatility: float
    sharpe: float

class Strategy(BaseModel):
    index: int
    address: str
    name: str
    currentAPY: float
    currentAllocation: float
    totalAssets: float
    historical: HistoricalData

class Tier(BaseModel):
    tier: int
    name: str
    strategies: List[Strategy]

class RebalanceFundsRequest(BaseModel):
    requestType: str
    timestamp: int
    tiers: List[Tier]

class mainRequest(BaseModel):
    base_apy: RebalanceFundsRequest

class rebalanceFundsResponse(BaseModel):
    new_allocation:dict
    baseapicurent: float
    previousbaseapi: float
    total_assets: float

class tradeBehaviorRequest(BaseModel):
    actionType: int
    tradeSizePct: float
    marketChangePct_1h: float
    marketChangePct_24h: float
    drawdownPct: float
    timeSinceDropMin: int
    tradesLast24h: int

