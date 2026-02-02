from typing import List, Dict, Any, Annotated
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
import json
import re

load_dotenv()

class NodeData:

    def __init__(self):
        self.llm = init_chat_model(model_provider="groq", model="llama-3.3-70b-versatile")
    
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