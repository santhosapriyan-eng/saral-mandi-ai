import pandas as pd
import numpy as np
import os
from xgboost import XGBRegressor

def predict_price(crop, market):
    """Predict price for crop in given market"""
    try:
        # Check if data file exists
        data_path = "data/mandi_sample.csv"
        if not os.path.exists(data_path):
            print(f"Data file not found: {data_path}")
            # Return default price based on crop
            default_prices = {
                "Tomato": 25.0,
                "Onion": 30.0,
                "Potato": 20.0,
                "Wheat": 22.0,
                "Rice": 35.0,
                "Corn": 18.0
            }
            return default_prices.get(crop, 25.0)
        
        df = pd.read_csv(data_path)
        
        # Filter data
        df_filtered = df[(df["crop"] == crop) & (df["market"] == market)]
        
        if len(df_filtered) < 2:
            # Return mean price or default
            if len(df_filtered) == 1:
                return float(df_filtered["price"].iloc[0])
            else:
                # Return default based on crop
                default_prices = {
                    "Tomato": 25.0,
                    "Onion": 30.0,
                    "Potato": 20.0,
                    "Wheat": 22.0,
                    "Rice": 35.0,
                    "Corn": 18.0
                }
                return default_prices.get(crop, 25.0)
        
        # Prepare data for model
        df_filtered["date"] = pd.to_datetime(df_filtered["date"])
        df_filtered["day"] = df_filtered["date"].dt.day
        
        X = df_filtered[["day"]].values
        y = df_filtered["price"].values
        
        # Train simple model
        model = XGBRegressor(
            n_estimators=50,
            learning_rate=0.1,
            max_depth=3,
            objective="reg:squarederror",
            random_state=42
        )
        
        model.fit(X, y)
        
        # Predict next day
        next_day = np.array([[df_filtered["day"].max() + 1]])
        prediction = model.predict(next_day)
        
        return round(float(prediction[0]), 2)
        
    except Exception as e:
        print(f"Prediction error for {crop} in {market}: {e}")
        # Return fallback price
        default_prices = {
            "Tomato": 25.0,
            "Onion": 30.0,
            "Potato": 20.0,
            "Wheat": 22.0,
            "Rice": 35.0,
            "Corn": 18.0
        }
        return default_prices.get(crop, 25.0)

def calculate_risk(prices):
    """Calculate risk level based on price volatility"""
    if not prices or len(prices) < 2:
        return "Low Risk (Stable Prices)"
    
    volatility = max(prices) - min(prices)
    
    if volatility < 2:
        return "Low Risk (Stable Prices)"
    elif volatility < 5:
        return "Medium Risk (Moderate Fluctuation)"
    else:
        return "High Risk (Volatile Market)"

def calculate_stability_score(prices):
    """Calculate stability score (0-100)"""
    if not prices or len(prices) < 2:
        return 85.0  # Default score
    
    volatility = max(prices) - min(prices)
    
    # Simple scoring logic
    score = max(0, min(100, 100 - (volatility * 15)))
    
    return round(float(score), 2)

def calculate_rmse(model, X, y):
    """Calculate RMSE for model evaluation"""
    from sklearn.metrics import mean_squared_error
    
    predictions = model.predict(X)
    rmse = np.sqrt(mean_squared_error(y, predictions))
    return round(float(rmse), 2)