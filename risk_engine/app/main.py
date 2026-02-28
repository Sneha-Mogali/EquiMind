# app/main.py

from fastapi import FastAPI
from app.inference import preprocess, predict_mlp
from app.risk_engine import compute_risk
import asyncio

app = FastAPI(title="Zero Trust Risk Engine")


@app.post("/predict")
async def predict(flow: dict):

    x = preprocess(flow)

    # Run concurrently
    mlp_task = asyncio.to_thread(predict_mlp, x)

    mlp_score = await asyncio.gather(mlp_task)

    risk_score = compute_risk(mlp_score)

    return {
        "mlp_score": mlp_score,
        "risk_score": risk_score,
    }