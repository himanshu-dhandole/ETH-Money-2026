from fastapi import FastAPI 
from graph import NodeData
from fastapi.middleware.cors import CORSMiddleware
from schemas import riskScoreSchemaRequest
import uvicorn
app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-risk-score")
def generate_riskscore(req: riskScoreSchemaRequest):
    node_data=NodeData()
    response = node_data.generateScore(req.QA)
    return response

@app.post("/reallocate")
def allocate(req:mainRequest):
    node_data=NodeData()
    base_apy_dict = req.base_apy.model_dump()
    response = node_data.allocate_funds(base_apy_dict)
    return response

if __name__=="__main__":
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)