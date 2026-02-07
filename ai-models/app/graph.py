from typing import List, Dict, Any, Annotated
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
import json
import re

load_dotenv()

class NodeData:

    def __init__(self):
        self.llm = init_chat_model(model_provider="groq", model="llama-3.3-70b-versatile")
    
    def allocate_funds(self,base_apy: Dict[str, Any]) -> dict:
        tiers = base_apy.get("tiers", [])
        result = {
            "requestType": base_apy.get("requestType", "rebalance"),
            "timestamp": base_apy.get("timestamp"),
            "tiers": []
        }

        LOSS_THRESHOLD = 2.0   
        MIN_ALLOC = 5.0           
        MAX_ALLOC = 80.0          
        SMOOTHING_ALPHA = 0.35   

        for tier in tiers:
            strategies = tier.get("strategies", [])
            if not strategies:
                result["tiers"].append(tier)
                continue

            scored = []
            for s in strategies:
                current_apy = float(s.get("currentAPY", 0))
                avg_apy = float(s.get("historical", {}).get("avgAPY", 0))

                weak = current_apy < (avg_apy - LOSS_THRESHOLD)

                # score favors current APY, but penalizes weak trend
                score = current_apy
                if weak:
                    score *= 0.5

                scored.append({
                    "strategy": s,
                    "score": max(score, 0.01),
                    "weak": weak,
                    "currentAPY": current_apy,
                    "avgAPY": avg_apy
                })

            total_score = sum(x["score"] for x in scored)
            target_allocs = [(x["score"] / total_score) * 100 for x in scored]

            smooth_allocs = []
            for i, x in enumerate(scored):
                old_alloc = float(x["strategy"].get("currentAllocation", 0))
                target = target_allocs[i]

                new_alloc = old_alloc + SMOOTHING_ALPHA * (target - old_alloc)
                smooth_allocs.append(new_alloc)

            clamped = [min(max(a, MIN_ALLOC), MAX_ALLOC) for a in smooth_allocs]

            total_clamped = sum(clamped)
            if total_clamped == 0:
                final_allocs = [100.0 / len(clamped)] * len(clamped)
            else:
                final_allocs = [(a / total_clamped) * 100 for a in clamped]

            rounded = [round(a, 2) for a in final_allocs]
            drift = round(100.0 - sum(rounded), 2)

            if abs(drift) > 0:
                best_idx = max(range(len(scored)), key=lambda i: scored[i]["score"])
                rounded[best_idx] = round(rounded[best_idx] + drift, 2)

            updated_strategies = []
            for i, x in enumerate(scored):
                s = x["strategy"]
                old_alloc = float(s.get("currentAllocation", 0))
                new_alloc = rounded[i]

                change = round(new_alloc - old_alloc, 2)

                reason = "Stable"
                if x["weak"]:
                    reason = "Weak trend (currentAPY below 7d avg) -> reduced allocation"
                elif x["currentAPY"] > x["avgAPY"]:
                    reason = "Strong trend (currentAPY above 7d avg) -> increased allocation"
                else:
                    reason = "Neutral trend -> small rebalance"

                updated_strategies.append({
                    **s,
                    "newAllocation": new_alloc,
                    "allocationChange": change,
                    "reason": reason
                })

            result["tiers"].append({
                "tier": tier.get("tier"),
                "name": tier.get("name"),
                "strategies": updated_strategies
            })

        return result

        

    def generateScore(self, QA: Dict[str, Any]) -> Dict[str, Any]:
        print("Generating Risk Score for QA:", QA)
        SYSTEM_PROMPT = f"""You are a financial risk assessment expert.
            Your task is to evaluate the Question and Answer (QA) data provided: {QA}
            Those questions where designed to find out the risk level of the user.
            Based on the answers generate :
             - Low risk score if the answers indicate a conservative approach to investments.
             - Medium risk score if the answers indicate a balanced approach to investments. 
             - High risk score if the answers indicate an aggressive approach to investments.


            Remember the risk score you are generating should follow this:
                low_risk + medium_risk + high_risk = 100

            Remember that the risk score should be allocated based on the answers provided in the QA data.             
            Provide the risk score as a JSON object with the key 'risk_score'.
            {{
                "risk_score": {{
                    "low_risk": 0,
                    "medium_risk": 0,
                    "high_risk": 0
                }}
            }}

            Rules:
            - All values must be integers
            - Sum must be exactly 100
            """
            
            
        risk_score = self.llm.invoke(SYSTEM_PROMPT)
        text = risk_score.content

        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {"error": "No JSON found in LLM response", "raw": text}

        return json.loads(match.group())



node = NodeData()

total_amount = 10000.0
risk_split = {"low": 50.0, "medium": 30.0, "high": 20.0}

assets = {
    "low": [{"asset": "Bond A", "apy": 3.0}, {"asset": "Bond B", "apy": 4.0}],
    "medium": [{"asset": "Stock A", "apy": 7.0}, {"asset": "Stock B", "apy": 6.0}],
    "high": [{"asset": "Crypto A", "apy": 15.0}, {"asset": "Crypto B", "apy": 20.0}]
}

allocation_result = node.allocate_funds(
    base_apy={
        "requestType": "rebalance",
        "timestamp": 1697055600,
        "tiers": [
            {
                "tier": 1,
                "name": "Low Risk",
                "strategies": [
                    {
                        "index": 0,
                        "address": "0xABCDEF1234567890",
                        "name": "Low Risk_Strategy_0",
                        "currentAPY": 4.0,
                        "currentAllocation": 50.0,
                        "totalAssets": 2000000.0,
                        "historical": {
                            "avgAPY": 4.5,
                            "volatility": 0.5,
                            "sharpe": 1.2
                        }
                    },
                    {
                        "index": 1,
                        "address": "0x1234567890ABCDEF",
                        "name": "Low Risk_Strategy_1",
                        "currentAPY": 3.0,
                        "currentAllocation": 50.0,
                        "totalAssets": 1500000.0,
                        "historical": {
                            "avgAPY": 3.5,
                            "volatility": 0.3,
                            "sharpe": 1.0
                        }
                    }
                ]
            },
            {
                "tier": 2,
                "name": "Medium Risk",
                "strategies": [
                    {
                        "index": 0,
                        "address": "0xFEDCBA0987654321",
                        "name": "Medium Risk_Strategy_0",
                        "currentAPY": 8.0,
                        "currentAllocation": 60.0,
                        "totalAssets": 3000000.0,
                        "historical": {
                            "avgAPY": 7.5,
                            "volatility": 1.5,
                            "sharpe": 1.5
                        }
                    },
                    {
                        "index": 1,
                        "address": "0x0987654321FEDCBA",
                        "name": "Medium Risk_Strategy_1",
                        "currentAPY": 6.0,
                        "currentAllocation": 40.0,
                        "totalAssets": 2500000.0,
                        "historical": {
                            "avgAPY": 6.5,
                            "volatility": 1.2,
                            "sharpe": 1.3
                        }
                    }
                ]
            },
            {
                "tier": 3,
                "name": "High Risk",
                "strategies": [
                    {
                        "index": 0,
                        "address": "0xA1B2C3D4E5F60789",
                        "name": "High Risk_Strategy_0",
                        "currentAPY": 18.0,
                        "currentAllocation": 70.0,
                        "totalAssets": 4000000.0,
                        "historical": {
                            "avgAPY": 17.5,
                            "volatility": 3.0,
                            "sharpe": 1.8
                        }
                    },
                    {
                        "index": 1,
                        "address": "0x7890F6E5D4C3B2A1",
                        "name": "High Risk_Strategy_1",
                        "currentAPY": 22.0,
                        "currentAllocation": 30.0,
                        "totalAssets": 3500000.0,
                        "historical": {
                            "avgAPY": 21.5,
                            "volatility": 4.0,
                            "sharpe": 1.6
                        }
                    }
                ]
            }
        ]
    }
)
# print("=== Allocation Result ===")
# print(json.dumps(allocation_result, indent=2))
