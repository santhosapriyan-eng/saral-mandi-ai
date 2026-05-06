from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import uvicorn
from typing import Optional

app = FastAPI()

# Configure CORS properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "SARAL MANDI AI Running 🚀", "message": "Server is active"}

@app.get("/crops")
def get_crops():
    # Return list of crops with proper formatting
    return [
        {"name": "Tomato", "emoji": "🍅"},
        {"name": "Onion", "emoji": "🧅"},
        {"name": "Potato", "emoji": "🥔"},
        {"name": "Wheat", "emoji": "🌾"},
        {"name": "Rice", "emoji": "🍚"},
        {"name": "Corn", "emoji": "🌽"}
    ]

@app.get("/recommend")
async def recommend(crop: str, quantity: int):
    try:
        # Import here to avoid circular imports
        from ai_agent import generate_advisory
        from model import predict_price, calculate_risk, calculate_stability_score
        
        # Validate inputs
        if not crop or quantity <= 0:
            raise HTTPException(status_code=400, detail="Invalid crop or quantity")
        
        markets = ["Coimbatore", "Erode", "Salem"]
        distances = {"Coimbatore": 0, "Erode": 100, "Salem": 120}
        transport_cost_per_km = 10
        
        results = []
        for market in markets:
            try:
                predicted_price = predict_price(crop, market)
                transport_cost = distances[market] * transport_cost_per_km
                net_profit = (predicted_price * quantity) - transport_cost
                results.append({
                    "market": market,
                    "predicted_price": float(predicted_price),
                    "transport_cost": float(transport_cost),
                    "net_profit": float(net_profit)
                })
            except Exception as e:
                print(f"Error processing {market}: {e}")
                # Fallback values
                results.append({
                    "market": market,
                    "predicted_price": 25.0,
                    "transport_cost": float(distances[market] * transport_cost_per_km),
                    "net_profit": float((25.0 * quantity) - (distances[market] * transport_cost_per_km))
                })
        
        if not results:
            raise HTTPException(status_code=500, detail="No market data available")
        
        best_market = max(results, key=lambda x: x["net_profit"])
        worst_market = min(results, key=lambda x: x["net_profit"])
        arbitrage_gap = best_market["net_profit"] - worst_market["net_profit"]
        prices = [r["predicted_price"] for r in results]
        
        risk = calculate_risk(prices)
        stability_score = calculate_stability_score(prices)
        average_price = sum(prices) / len(prices)
        decision = "SELL NOW (Favorable Market)" if best_market["predicted_price"] > average_price else "WAIT (Market may improve)"
        
        # Generate advisory with error handling
        try:
            advisory = generate_advisory(crop, quantity, best_market["market"], best_market["net_profit"], risk)
        except Exception as e:
            print(f"Advisory error: {e}")
            advisory = f"Sell your {quantity}kg of {crop} in {best_market['market']} for best profit of ₹{best_market['net_profit']:.2f}. Market risk is {risk.lower()}."
        
        return JSONResponse(content={
            "best_market": best_market,
            "risk": risk,
            "stability_score": float(stability_score),
            "decision": decision,
            "arbitrage_gap": float(arbitrage_gap),
            "ai_advisory": advisory,
            "all_markets": results
        })
        
    except Exception as e:
        print(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendation: {str(e)}")

@app.get("/advisory.mp3")
async def get_audio():
    # Check multiple possible locations
    possible_paths = ["advisory.mp3", "static/advisory.mp3", "audio/advisory.mp3"]
    
    for path in possible_paths:
        if os.path.exists(path):
            return FileResponse(path, media_type="audio/mpeg")
    
    # Return a 404 if not found
    return JSONResponse(
        status_code=404,
        content={"error": "Audio file not found. Generate voice advisory first."}
    )

@app.get("/voice")
async def generate_voice(crop: str = None, quantity: int = None):
    """Generate voice advisory for the given crop and quantity"""
    try:
        # First get recommendation
        rec_result = await recommend(crop, quantity)
        
        # Extract advisory text
        if isinstance(rec_result, dict):
            advisory_text = rec_result.get("ai_advisory", "")
        else:
            advisory_text = "Unable to generate voice advisory at this moment."
        
        # Generate voice using your voice.py
        from voice import generate_voice
        audio_path = generate_voice(advisory_text)
        
        if os.path.exists(audio_path):
            return FileResponse(audio_path, media_type="audio/mpeg")
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Audio file generation failed"}
            )
            
    except Exception as e:
        print(f"Voice generation error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Voice generation failed: {str(e)}"}
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "backend": "running"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)