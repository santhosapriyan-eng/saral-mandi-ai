import requests
import json
from config import FEATHER_API_KEY

print("Feather Key loaded:", bool(FEATHER_API_KEY))

def generate_advisory(crop, quantity, market, profit, risk):
    """Generate AI advisory for farmer"""
    
    prompt = f"""A farmer wants to sell {quantity} kg of {crop}.
Best market is {market}.
Expected profit is ₹{profit:.2f}.
Risk level: {risk}.

Explain in simple farmer-friendly Tamil-English mix (Tanglish) why this is a good decision.
Keep it short, practical, and easy to understand for a farmer.

Example: "Tomato ku nalla market Coimbatore. Anga ₹5000 varai profit edukalam. Risk kammi tha."
"""
    
    try:
        # Check if API key exists
        if not FEATHER_API_KEY:
            return generate_fallback_advisory(crop, quantity, market, profit, risk)
        
        # Make API request
        response = requests.post(
            "https://api.featherless.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {FEATHER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-ai/DeepSeek-V3-0324",
                "messages": [
                    {"role": "system", "content": "You are a helpful agricultural advisor speaking in simple Tanglish (Tamil+English) for farmers."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 150
            },
            timeout=10  # 10 second timeout
        )
        
        # Check if request was successful
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            else:
                return generate_fallback_advisory(crop, quantity, market, profit, risk)
        else:
            print(f"API error: {response.status_code}")
            return generate_fallback_advisory(crop, quantity, market, profit, risk)
            
    except requests.exceptions.Timeout:
        print("API request timed out")
        return generate_fallback_advisory(crop, quantity, market, profit, risk)
    except requests.exceptions.ConnectionError:
        print("Connection error to API")
        return generate_fallback_advisory(crop, quantity, market, profit, risk)
    except Exception as e:
        print(f"Advisory generation error: {e}")
        return generate_fallback_advisory(crop, quantity, market, profit, risk)

def generate_fallback_advisory(crop, quantity, market, profit, risk):
    """Generate fallback advisory when API fails"""
    
    profit_in_rs = int(profit)
    risk_lower = risk.lower()
    
    if "low" in risk_lower:
        risk_msg = "romba safe. Risk romba kammi."
    elif "medium" in risk_lower:
        risk_msg = "konjam risk irukku. But profit nalla irukku."
    else:
        risk_msg = "risk romba athigam. But profit um athigam."
    
    return f"{crop} - {quantity} kg ku nalla market {market}. Anga ₹{profit_in_rs} varai profit edukalam. {risk_msg} Indha market ku sell panna nalla irukkum. Transport cost ku aprmum nalla profit kedaikkum."